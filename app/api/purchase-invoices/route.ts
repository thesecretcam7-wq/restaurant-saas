import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

interface PurchaseInvoiceLineInput {
  inventoryId?: string | null
  productName?: string
  quantity?: unknown
  packageSize?: unknown
  packageUnit?: string
  lineTotal?: unknown
}

interface BillPaymentRow {
  id: string
  supplier_name: string | null
  concept: string | null
  invoice_number: string | null
  amount: number | string | null
  staff_name: string | null
  paid_at: string | null
  notes: string | null
  payment_method: string | null
  cash_closing_id: string | null
}

const MONTH_ORDERS_PAGE_SIZE = 1000

function toNumber(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : NaN
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function getMonthStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function getTodayStartIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
}

function isActivePaidOrder(order: any) {
  const status = String(order?.status || '').trim().toLowerCase()
  return order?.payment_status === 'paid' && !['cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado'].includes(status)
}

function isMissingBillPaymentsTable(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`
  return text.includes('cash_bill_payments') || error?.code === '42P01' || error?.code === 'PGRST205'
}

async function fetchMonthOrders(supabase: any, tenantId: string, monthStartIso: string) {
  const rows: any[] = []
  let from = 0
  let totalCount = 0

  while (true) {
    const { data, error, count } = await supabase
      .from('orders')
      .select('id, total, created_at, payment_status, status', { count: from === 0 ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStartIso)
      .order('created_at', { ascending: false })
      .range(from, from + MONTH_ORDERS_PAGE_SIZE - 1)

    if (error) return { data: null, error }
    if (from === 0) totalCount = count || 0
    rows.push(...(data || []))

    if (!data || data.length < MONTH_ORDERS_PAGE_SIZE || from + MONTH_ORDERS_PAGE_SIZE >= totalCount) break
    from += MONTH_ORDERS_PAGE_SIZE
  }

  return { data: rows, error: null }
}

async function fetchMonthBillPayments(supabase: any, tenantId: string, monthStartIso: string) {
  const rows: BillPaymentRow[] = []
  let from = 0
  let totalCount = 0

  while (true) {
    const { data, error, count } = await supabase
      .from('cash_bill_payments')
      .select('id, supplier_name, concept, invoice_number, amount, staff_name, paid_at, notes, payment_method, cash_closing_id', { count: from === 0 ? 'exact' : undefined })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .gte('paid_at', monthStartIso)
      .order('paid_at', { ascending: false })
      .range(from, from + MONTH_ORDERS_PAGE_SIZE - 1)

    if (error) {
      if (isMissingBillPaymentsTable(error)) return { data: [], error: null, setupRequired: true }
      return { data: null, error, setupRequired: false }
    }
    if (from === 0) totalCount = count || 0
    rows.push(...((data || []) as BillPaymentRow[]))

    if (!data || data.length < MONTH_ORDERS_PAGE_SIZE || from + MONTH_ORDERS_PAGE_SIZE >= totalCount) break
    from += MONTH_ORDERS_PAGE_SIZE
  }

  return { data: rows, error: null, setupRequired: false }
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const monthStartIso = getMonthStartIso()
    const todayStartIso = getTodayStartIso()

    const [
      { data: invoices, error },
      { data: monthOrders, error: ordersError },
      { data: billPayments, error: billPaymentsError, setupRequired: billPaymentsSetupRequired },
    ] = await Promise.all([
      supabase
      .from('supplier_purchase_invoices')
      .select(`
        id,
        tenant_id,
        supplier_name,
        invoice_number,
        invoice_date,
        total,
        notes,
        created_at,
        supplier_purchase_invoice_items (
          id,
          inventory_id,
          product_name,
          quantity,
          package_size,
          package_unit,
          line_total,
          unit_price,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80),
      fetchMonthOrders(supabase, tenantId, monthStartIso),
      fetchMonthBillPayments(supabase, tenantId, monthStartIso),
    ])

    if (error) throw error
    if (ordersError) throw ordersError
    if (billPaymentsError) throw billPaymentsError

    const paidOrders = (monthOrders || []).filter(isActivePaidOrder)
    const salesThisMonth = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    const salesToday = paidOrders
      .filter((order) => new Date(order.created_at) >= new Date(todayStartIso))
      .reduce((sum, order) => sum + Number(order.total || 0), 0)
    const normalizedBillPayments = ((billPayments || []) as BillPaymentRow[]).map((payment) => ({
      id: payment.id,
      supplier_name: payment.supplier_name,
      concept: payment.concept,
      invoice_number: payment.invoice_number,
      amount: Number(payment.amount) || 0,
      staff_name: payment.staff_name,
      paid_at: payment.paid_at,
      notes: payment.notes,
      payment_method: payment.payment_method || 'cash',
      cash_closing_id: payment.cash_closing_id,
    }))
    const billPaymentsToday = normalizedBillPayments.filter((payment) =>
      payment.paid_at && new Date(payment.paid_at) >= new Date(todayStartIso)
    )
    const sumPayments = (payments: typeof normalizedBillPayments, method?: string) =>
      payments
        .filter((payment) => !method || payment.payment_method === method)
        .reduce((sum, payment) => sum + payment.amount, 0)

    return NextResponse.json({
      invoices: invoices || [],
      salesSummary: {
        salesThisMonth,
        salesToday,
        ordersThisMonth: paidOrders.length,
        ordersToday: paidOrders.filter((order) => new Date(order.created_at) >= new Date(todayStartIso)).length,
      },
      billPaymentsSummary: {
        payments: normalizedBillPayments,
        paidThisMonth: sumPayments(normalizedBillPayments),
        paidToday: sumPayments(billPaymentsToday),
        cashThisMonth: sumPayments(normalizedBillPayments, 'cash'),
        cashToday: sumPayments(billPaymentsToday, 'cash'),
        externalThisMonth: sumPayments(normalizedBillPayments, 'external'),
        externalToday: sumPayments(billPaymentsToday, 'external'),
        countThisMonth: normalizedBillPayments.length,
        countToday: billPaymentsToday.length,
        setupRequired: Boolean(billPaymentsSetupRequired),
      },
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error fetching purchase invoices:', error)
    return NextResponse.json({ error: 'No se pudieron cargar las compras' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await request.json()
    const tenantId = normalizeText(body.tenantId)
    const supplierName = normalizeText(body.supplierName)
    const invoiceNumber = normalizeText(body.invoiceNumber)
    const invoiceDate = normalizeText(body.invoiceDate) || new Date().toISOString().slice(0, 10)
    const notes = normalizeText(body.notes)
    const rawLines = Array.isArray(body.lines) ? body.lines as PurchaseInvoiceLineInput[] : []

    if (!tenantId || !supplierName || rawLines.length === 0) {
      return NextResponse.json(
        { error: 'Completa proveedor y al menos un producto' },
        { status: 400 }
      )
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const lines = rawLines.map((line) => {
      const productName = normalizeText(line.productName)
      const quantity = toNumber(line.quantity)
      const packageSize = toNumber(line.packageSize, 1)
      const lineTotal = toNumber(line.lineTotal)
      const packageUnit = normalizeText(line.packageUnit) || 'unidad'
      const totalUnits = quantity * packageSize
      const unitPrice = totalUnits > 0 ? lineTotal / totalUnits : NaN

      return {
        tenant_id: tenantId,
        inventory_id: line.inventoryId || null,
        product_name: productName,
        quantity,
        package_size: packageSize,
        package_unit: packageUnit,
        line_total: lineTotal,
        unit_price: unitPrice,
      }
    })

    const invalidLine = lines.find((line) =>
      !line.product_name ||
      !Number.isFinite(line.quantity) ||
      !Number.isFinite(line.package_size) ||
      !Number.isFinite(line.line_total) ||
      !Number.isFinite(line.unit_price) ||
      line.quantity <= 0 ||
      line.package_size <= 0 ||
      line.line_total < 0
    )

    if (invalidLine) {
      return NextResponse.json(
        { error: 'Revisa productos, cantidades y totales de la factura' },
        { status: 400 }
      )
    }

    const invoiceTotal = lines.reduce((sum, line) => sum + line.line_total, 0)
    const { data: invoice, error: invoiceError } = await supabase
      .from('supplier_purchase_invoices')
      .insert({
        tenant_id: tenantId,
        supplier_name: supplierName,
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate,
        total: invoiceTotal,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (invoiceError) throw invoiceError

    const { error: itemsError } = await supabase
      .from('supplier_purchase_invoice_items')
      .insert(lines.map((line) => ({ ...line, invoice_id: invoice.id })))

    if (itemsError) {
      await supabase
        .from('supplier_purchase_invoices')
        .delete()
        .eq('id', invoice.id)
        .eq('tenant_id', tenantId)
      throw itemsError
    }

    return NextResponse.json({ id: invoice.id }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error creating purchase invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar la compra' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId')
  const invoiceId = searchParams.get('id')

  if (!tenantId || !invoiceId) {
    return NextResponse.json({ error: 'Faltan datos para borrar la factura' }, { status: 400 })
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const { error } = await supabase
      .from('supplier_purchase_invoices')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', invoiceId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error deleting purchase invoice:', error)
    return NextResponse.json({ error: 'No se pudo borrar la factura' }, { status: 500 })
  }
}
