import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse, TenantAuthError } from '@/lib/tenant-api-auth'
import { writeAuditLog } from '@/lib/audit-log'

function cleanText(value: unknown, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || fallback
}

function isMissingBillPaymentsTable(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return text.includes('cash_bill_payments') || error?.code === '42P01' || error?.code === 'PGRST205'
}

function isPaymentMethodConstraintError(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return error?.code === '23514' && text.includes('payment_method')
}

function toPaidAtIso(value: unknown) {
  const text = cleanText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T12:00:00.000Z`).toISOString()
  }

  const parsed = text ? new Date(text) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tenantId = cleanText(body.tenantId)
    const amount = Number(String(body.amount || '').replace(',', '.'))
    const supplierName = cleanText(body.supplierName, 'Factura pagada')
    const concept = cleanText(body.concept)
    const invoiceNumber = cleanText(body.invoiceNumber)
    const notes = cleanText(body.notes)
    const paidAt = toPaidAtIso(body.paidAt)

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
    }
    if (!supplierName) {
      return NextResponse.json({ error: 'Escribe proveedor o concepto' }, { status: 400 })
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Importe invalido' }, { status: 400 })
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })
    const staffName = access.type === 'staff'
      ? access.role === 'admin'
        ? 'Admin'
        : access.role || 'Staff'
      : 'Admin'
    const staffId = access.type === 'staff' && access.staffId
      ? access.staffId
      : null

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('cash_bill_payments')
      .insert({
        tenant_id: tenantId,
        staff_id: staffId,
        staff_name: staffName,
        supplier_name: supplierName,
        concept: concept || null,
        invoice_number: invoiceNumber || null,
        amount,
        notes: notes || null,
        payment_method: 'external',
        status: 'active',
        cash_closing_id: null,
        paid_at: paidAt,
      })
      .select('id')
      .single()

    if (error) {
      if (isMissingBillPaymentsTable(error) || isPaymentMethodConstraintError(error)) {
        return NextResponse.json(
          { error: 'Falta aplicar la migracion de pagos por aparte en Supabase.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ payment: data }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}

async function changePayment(request: NextRequest, action: 'correct' | 'void') {
  try {
    const body = action === 'correct' ? await request.json() : {}
    const tenantId = cleanText(body.tenantId || request.nextUrl.searchParams.get('tenantId'))
    const paymentId = cleanText(body.id || request.nextUrl.searchParams.get('id'))
    if (!tenantId || !paymentId) return NextResponse.json({ error: 'Faltan datos de la factura' }, { status: 400 })
    const rawAmount = Number(String(body.amount ?? '').replace(',', '.'))
    const correctedAmount = Math.round(rawAmount * 100) / 100
    if (action === 'correct' && (!Number.isFinite(correctedAmount) || correctedAmount <= 0)) {
      return NextResponse.json({ error: 'Escribe un importe mayor que cero. Para quitar el pago, utiliza Anular.' }, { status: 400 })
    }
    const actor = await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })
    const supabase = createServiceClient()
    const { data: payment, error: readError } = await supabase.from('cash_bill_payments')
      .select('id, amount, status, payment_method, cash_closing_id, paid_at, notes, updated_at')
      .eq('tenant_id', tenantId).eq('id', paymentId).maybeSingle()
    if (readError) throw readError
    if (!payment) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (payment.status === 'voided' && action === 'void') return NextResponse.json({ ok: true, alreadyVoided: true })
    if (payment.status !== 'active') return NextResponse.json({ error: 'Esta factura ya está anulada. Actualiza la lista.' }, { status: 409 })
    if (!['cash', 'external'].includes(payment.payment_method)) return NextResponse.json({ error: 'Tipo de pago no válido' }, { status: 409 })
    if (payment.payment_method === 'cash' && payment.cash_closing_id) {
      return NextResponse.json({ error: 'Esta factura ya está incluida en un cierre de caja. No se puede cambiar desde aquí.' }, { status: 409 })
    }
    const previousAmount = Number(payment.amount)
    const amount = action === 'correct' ? correctedAmount : previousAmount
    if (action === 'correct' && amount === previousAmount) return NextResponse.json({ ok: true, payment, unchanged: true })
    const timestamp = new Date().toISOString()
    const reason = action === 'correct'
      ? `Importe corregido desde administración: ${previousAmount.toFixed(2)} → ${amount.toFixed(2)}`
      : `Pago anulado desde administración: ${previousAmount.toFixed(2)}`
    const update = {
      ...(action === 'correct' ? { amount } : { status: 'voided' }),
      updated_at: timestamp,
      notes: [payment.notes, `${timestamp}: ${reason}`].filter(Boolean).join('\n'),
    }
    let query = supabase.from('cash_bill_payments').update(update)
      .eq('tenant_id', tenantId).eq('id', paymentId).eq('status', 'active')
    query = payment.updated_at ? query.eq('updated_at', payment.updated_at) : query.is('updated_at', null)
    if (payment.payment_method === 'cash') query = query.is('cash_closing_id', null)
    const { data: updated, error } = await query.select('id, amount, status').maybeSingle()
    if (error && error.code !== 'PGRST116') throw error
    if (!updated) return NextResponse.json({ error: 'La factura ha cambiado o se ha cerrado la caja. Actualiza antes de volver a intentarlo.' }, { status: 409 })
    await writeAuditLog(supabase, {
      tenantId, actor, action: action === 'correct' ? 'bill_payment.corrected' : 'bill_payment.voided',
      entityType: 'cash_bill_payment', entityId: paymentId, reason,
      metadata: { previous_amount: previousAmount, amount, payment_method: payment.payment_method, paid_at: payment.paid_at },
    })
    return NextResponse.json({ ok: true, payment: updated })
  } catch (error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo modificar la factura' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  return changePayment(request, 'correct')
}

export async function DELETE(request: NextRequest) {
  return changePayment(request, 'void')
}
