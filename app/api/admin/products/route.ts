import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { tenantId, name, description, price, categoryId, imageUrl, available, featured } = await req.json()

    if (!tenantId || !name || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('menu_items').insert({
      tenant_id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      price: parseFloat(price),
      category_id: categoryId || null,
      image_url: imageUrl || null,
      available: available ?? true,
      featured: featured ?? false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
