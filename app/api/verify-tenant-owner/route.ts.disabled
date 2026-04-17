import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Verifica si el usuario actual es propietario del tenant
 *
 * GET /api/verify-tenant-owner?slug=cloud-restaurant
 *
 * Returns:
 * { isOwner: true, tenantId: "uuid", plan: "pro" }
 * { isOwner: false }
 */
export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Obtener usuario actual del header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { isOwner: false, reason: 'No auth header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verificar token y obtener user_id
    const { data: userData, error: userError } = await supabase.auth.getUser(token)

    if (userError || !userData.user) {
      console.error('[verify-tenant-owner] Auth error:', userError?.message)
      return NextResponse.json(
        { isOwner: false, reason: 'Invalid token' },
        { status: 401 }
      )
    }

    // Buscar tenant: si el parámetro es un UUID buscamos por ID, si no por slug
    // Buscar tenant: si el parámetro es UUID buscamos por id, si no por slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

    let tenant = null
    let tenantError = null

    if (isUUID) {
      const result = await supabase
        .from('tenants')
        .select('id, owner_id, subscription_plan')
        .eq('id', slug)
        .single()
      tenant = result.data
      tenantError = result.error
    } else {
      const result = await supabase
        .from('tenants')
        .select('id, owner_id, subscription_plan')
        .eq('slug', slug)
        .single()
      tenant = result.data
      tenantError = result.error
    }

    if (tenantError || !tenant) {
      console.error('[verify-tenant-owner] Tenant not found:', slug, '| isUUID:', isUUID)
      return NextResponse.json(
        { isOwner: false, reason: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Verificar ownership
    const isOwner = tenant.owner_id === userData.user.id

    console.log(
      `[verify-tenant-owner] ${isOwner ? '✅' : '❌'} User ${userData.user.id} checking access to ${slug}`
    )

    return NextResponse.json({
      isOwner,
      tenantId: tenant.id,
      plan: tenant.subscription_plan || 'free',
    })
  } catch (error) {
    console.error('[verify-tenant-owner] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', isOwner: false },
      { status: 500 }
    )
  }
}
