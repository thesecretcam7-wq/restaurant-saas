import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { tenantId, name, description, sortOrder, imageUrl } = await req.json()

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase.from('menu_categories').insert({
      tenant_id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      sort_order: sortOrder || 0,
      image_url: imageUrl || null,
      active: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { tenantId, categoryId, name, description, sortOrder, imageUrl, active } = await req.json()

    if (!tenantId || !categoryId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('menu_categories')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        sort_order: sortOrder || 0,
        image_url: imageUrl || null,
        active: active ?? true,
      })
      .eq('id', categoryId)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { tenantId, categoryId } = await req.json()

    if (!tenantId || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
