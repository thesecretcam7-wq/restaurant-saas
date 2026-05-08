import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tenantId = request.nextUrl.searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'] })
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('product_recipes')
      .select('id, inventory_id, quantity, unit, inventory:inventory_id(id, product_name, current_stock)')
      .eq('tenant_id', tenantId)
      .eq('menu_item_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recipe: data || [] })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error fetching recipe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tenantId, ingredients } = body

    if (!tenantId || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'tenantId and ingredients are required' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: ['admin'] })
    const supabase = createServiceClient()

    const cleanIngredients = ingredients
      .map((ingredient: any) => ({
        tenant_id: tenantId,
        menu_item_id: id,
        inventory_id: String(ingredient.inventory_id || ''),
        quantity: Number(ingredient.quantity),
        unit: ingredient.unit ? String(ingredient.unit).trim() : null,
        updated_at: new Date().toISOString(),
      }))
      .filter((ingredient: any) => ingredient.inventory_id && Number.isFinite(ingredient.quantity) && ingredient.quantity > 0)

    const { error: deleteError } = await supabase
      .from('product_recipes')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('menu_item_id', id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (cleanIngredients.length > 0) {
      const { error: insertError } = await supabase
        .from('product_recipes')
        .insert(cleanIngredients)

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Error saving recipe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
