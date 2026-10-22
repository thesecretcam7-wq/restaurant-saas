import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse, TenantAuthError } from '@/lib/tenant-api-auth'
import { verifyCSRFToken, sendCSRFErrorResponse } from '@/lib/csrf'
import { ensureInventoryItemForMenuItem } from '@/lib/inventory-sync'
import { posProductInput } from '@/lib/pos-product-input'

const PRODUCT_COLUMNS = 'id, name, price, category_id, image_url, available, sort_order, show_in_store'

export async function POST(request: NextRequest) {
  try {
    if (!await verifyCSRFToken(request)) return sendCSRFErrorResponse()
    const parsed = posProductInput.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const { tenantId, requestId, name, price, categoryId, showInStore } = parsed.data
    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'], requireAdminPermission: true })
    const supabase = createServiceClient()
    const signal = AbortSignal.timeout(8_000)

    if (access.type === 'staff') {
      const { data: staff, error } = await supabase.from('staff_members').select('id')
        .eq('id', access.staffId!).eq('tenant_id', tenantId).eq('role', access.role!).eq('is_active', true)
        .abortSignal(signal).maybeSingle().retry(false)
      if (error) throw error
      if (!staff) throw new TenantAuthError('Forbidden', 403)
    }

    const { data: category, error: categoryError } = await supabase.from('menu_categories').select('id')
      .eq('id', categoryId).eq('tenant_id', tenantId).eq('active', true)
      .abortSignal(signal).maybeSingle().retry(false)
    if (categoryError) throw categoryError
    if (!category) return NextResponse.json({ error: 'La categoria no pertenece a este restaurante o no esta activa' }, { status: 400 })

    // The client keeps this UUID on retry, so an uncertain network response cannot create a second product.
    const result = await supabase.from('menu_items').insert({
      id: requestId, tenant_id: tenantId, name, price, category_id: categoryId,
      available: true, show_in_store: showInStore, featured: false, sort_order: 0,
      variants: { show_in_upsell: false, requires_kitchen: true },
    }).select(PRODUCT_COLUMNS).abortSignal(signal).single().retry(false)

    let item = result.data
    let created = true
    if (result.error?.code === '23505') {
      const previous = await supabase.from('menu_items').select(PRODUCT_COLUMNS)
        .eq('id', requestId).eq('tenant_id', tenantId).abortSignal(signal).maybeSingle().retry(false)
      if (previous.error) throw previous.error
      item = previous.data
      if (!item || item.name !== name || Number(item.price) !== price || item.category_id !== categoryId
        || item.show_in_store !== showInStore) {
        return NextResponse.json({ error: 'Este intento ya se guardo con otros datos. Comprueba el catalogo antes de crear otro producto.' }, { status: 409 })
      }
      created = false
    } else if (result.error) throw result.error
    if (!item) throw new Error('Missing created product')

    let warning: string | undefined
    try {
      await ensureInventoryItemForMenuItem(supabase, {
        tenantId, productId: item.id, productName: item.name, signal: AbortSignal.timeout(5_000),
      })
    } catch {
      // The product is already saved: never report a failed creation or delete it after an inventory timeout.
      warning = 'Producto guardado. La ficha de inventario queda pendiente de sincronizar.'
      console.warn('[pos products] Inventory synchronization pending')
    }
    return NextResponse.json({ item, warning }, { status: created ? 201 : 200, headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof TenantAuthError) return tenantAuthErrorResponse(error)
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Datos del producto invalidos' }, { status: 400 })
    console.error('[pos products] Creation failed', error)
    return NextResponse.json({ error: 'No se pudo confirmar el guardado. Reintenta desde este formulario para evitar duplicados.' }, { status: 503 })
  }
}
