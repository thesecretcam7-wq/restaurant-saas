import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

async function createConnectLink(request: NextRequest, tenantParam?: string | null) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
    const requestedTenant = tenantParam || body.tenantId || body.domain || null
    const isUUID = requestedTenant && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTenant)

    let tenantQuery = supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', user.id)

    if (requestedTenant) {
      tenantQuery = tenantQuery.eq(isUUID ? 'id' : 'slug', requestedTenant)
    }

    const { data: tenant } = requestedTenant
      ? await tenantQuery.single()
      : await tenantQuery.single()

    if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })

    let stripeAccountId = tenant.stripe_account_id
    const stripe = getStripe()

    // Create Stripe Connected Account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: tenant.owner_email,
        metadata: { tenant_id: tenant.id },
      })
      stripeAccountId = account.id

      await supabase
        .from('tenants')
        .update({ stripe_account_id: stripeAccountId, stripe_account_status: 'pending' })
        .eq('id', tenant.id)
    }

    const appOrigin = tenant.primary_domain
      ? `https://${tenant.primary_domain}`
      : (process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin)
    const tenantSlug = tenant.slug || tenant.id

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      refresh_url: `${appOrigin}/${tenantSlug}/admin/configuracion/stripe`,
      return_url: `${appOrigin}/${tenantSlug}/admin/configuracion/stripe?connected=true`,
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Stripe connect error:', error)
    return NextResponse.json({ error: 'Error al conectar con Stripe' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return createConnectLink(request)
}

export async function GET(request: NextRequest) {
  return createConnectLink(request, request.nextUrl.searchParams.get('tenantId') || request.nextUrl.searchParams.get('domain'))
}
