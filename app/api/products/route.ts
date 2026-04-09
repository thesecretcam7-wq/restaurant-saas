import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const domain = searchParams.get('domain')

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant ID from domain
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get menu items with category names
    const { data: items, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        description,
        price,
        category_id,
        available,
        featured,
        image_url,
        created_at,
        menu_categories(name)
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format items with category name
    const formattedItems = items?.map((item: any) => ({
      ...item,
      category_name: (Array.isArray(item.menu_categories) ? item.menu_categories[0]?.name : item.menu_categories?.name) || null,
      menu_categories: undefined,
    })) || []

    return NextResponse.json({ items: formattedItems })
  } catch (err) {
    console.error('Products GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { domain, name, description, price, categoryId, featured, imageUrl } = body

    if (!domain || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', domain)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        tenant_id: tenant.id,
        name,
        description: description || null,
        price: parseFloat(price),
        category_id: categoryId || null,
        featured: featured || false,
        image_url: imageUrl || null,
        available: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error('Products POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
