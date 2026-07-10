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

    const [{ data: invoices, error }, { data: monthOrders, error: ordersError }] = await Promise.all([
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
      supabase
        .from('orders')
        .select('id, total, created_at, payment_status, status')
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStartIso)
        .order('created_at', { ascending: false })
        .limit(5000),
    ])

    if (error) throw error
    if (ordersError) throw ordersError

    const paidOrders = (monthOrders || []).filter(isActivePaidOrder)
    const salesThisMonth = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
    const salesToday = paidOrders
      .filter((order) => new Date(order.created_at) >= new Date(todayStartIso))
      .reduce((sum, order) => sum + Number(order.total || 0), 0)

    return NextResponse.json({
      invoices: invoices || [],
      salesSummary: {
        salesThisMonth,
        salesToday,
        ordersThisMonth: paidOrders.length,
        ordersToday: paidOrders.filter((order) => new Date(order.created_at) >= new Date(todayStartIso)).length,
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
