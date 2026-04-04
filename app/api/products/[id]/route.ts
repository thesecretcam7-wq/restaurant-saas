import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const productId = id

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

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

    const supabase = await createServiceClient()

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
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (err) {
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

    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', productId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete product error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
