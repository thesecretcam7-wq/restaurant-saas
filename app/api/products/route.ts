import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCSRFToken, sendCSRFErrorResponse } from '@/lib/csrf'

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
    // SECURITY: Verify CSRF token
    const isValidCSRF = await verifyCSRFToken(request)
    if (!isValidCSRF) {
      return sendCSRFErrorResponse()
    }

    const body = await request.json()
    const { domain, name, description, price, categoryId, featured, imageUrl } = body

    if (!domain || !name || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SECURITY: Verify user owns the tenant
    const { verifyTenantOwnership, sendErrorResponse } = await import('@/lib/auth-helpers')
    try {
      const { tenantId } = await verifyTenantOwnership(request, domain)

      const supabase = createServiceClient()

      const { data: item, error } = await supabase
        .from('menu_items')
        .insert({
          tenant_id: tenantId,
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
    } catch (authError) {
      const { sendErrorResponse } = await import('@/lib/auth-helpers')
      const statusCode =
        authError instanceof Error && authError.message.includes('Unauthorized') ? 401 :
        authError instanceof Error && authError.message.includes('Forbidden') ? 403 : 500
      return sendErrorResponse(authError, statusCode)
    }
  } catch (err) {
    console.error('Products POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
