import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, name, description, price, categoryId, imageUrl, available, featured, showInUpsell } = body

    // Validación detallada
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id es requerido' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'El nombre del producto es obligatorio' }, { status: 400 })
    }
    if (!price && price !== 0) {
      return NextResponse.json({ error: 'El precio es obligatorio' }, { status: 400 })
    }

    const parsedPrice = parseFloat(String(price))
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'El precio debe ser un número válido y positivo' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const productData = {
      tenant_id: tenantId,
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      price: parsedPrice,
      category_id: categoryId || null,
      image_url: imageUrl || null,
      available: available ?? true,
      featured: featured ?? false,
      variants: { show_in_upsell: showInUpsell ?? false },
    }

    const { error } = await supabase.from('menu_items').insert(productData)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message || 'Error al guardar el producto' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: `Error al procesar: ${message}` }, { status: 500 })
  }
}
