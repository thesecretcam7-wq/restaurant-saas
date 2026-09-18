import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

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

export async function DELETE(request: NextRequest) {
  const tenantId = cleanText(request.nextUrl.searchParams.get('tenantId'))
  const paymentId = cleanText(request.nextUrl.searchParams.get('id'))

  if (!tenantId || !paymentId) {
    return NextResponse.json({ error: 'Faltan datos para borrar el pago' }, { status: 400 })
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('cash_bill_payments')
      .update({ status: 'voided', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', paymentId)
      .eq('payment_method', 'external')

    if (error) {
      if (isMissingBillPaymentsTable(error)) {
        return NextResponse.json(
          { error: 'Falta aplicar la migracion de pagos por aparte en Supabase.' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ ok: true })
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
