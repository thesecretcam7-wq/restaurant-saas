import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse, TenantAuthError } from '@/lib/tenant-api-auth'

async function requireProductManagement(productId: string) {
  const supabase = createServiceClient()
  const { data: product, error } = await supabase.from('menu_items').select('tenant_id')
    .eq('id', productId).abortSignal(AbortSignal.timeout(8_000)).maybeSingle().retry(false)
  if (error) throw error
  if (!product) throw new TenantAuthError('Product not found', 404)
  await requireTenantAccess(product.tenant_id, { staffRoles: ['admin'] })
  return { supabase, tenantId: product.tenant_id as string }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const productId = id

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: item, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (err) {
    console.error('Get product error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const productId = id
    const body = await request.json()
    const { name, description, price, categoryId, featured, available, imageUrl } = body

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const { supabase, tenantId } = await requireProductManagement(productId)

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = parseFloat(price)
    if (categoryId !== undefined) updateData.category_id = categoryId
    if (featured !== undefined) updateData.featured = featured
    if (available !== undefined) updateData.available = available
    if (imageUrl !== undefined) updateData.image_url = imageUrl
    updateData.updated_at = new Date().toISOString()

    const { data: item, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', productId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (err) {
    if (err instanceof TenantAuthError) return tenantAuthErrorResponse(err)
    console.error('Update product error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const productId = id

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const { supabase, tenantId } = await requireProductManagement(productId)

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', productId)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof TenantAuthError) return tenantAuthErrorResponse(err)
    console.error('Delete product error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
