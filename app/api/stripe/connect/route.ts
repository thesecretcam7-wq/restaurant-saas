import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Falta STRIPE_SECRET_KEY en las variables de entorno')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno' },
        { status: 500 }
      )
    }

    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {}
    const requestedTenant = tenantParam || body.tenantId || body.domain || null
    const isUUID = requestedTenant && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedTenant)

    let tenantQuery = serviceSupabase
      .from('tenants')
      .select('*')
      .eq('owner_id', user.id)

    if (requestedTenant) {
      tenantQuery = tenantQuery.eq(isUUID ? 'id' : 'slug', requestedTenant)
    }

    const { data: tenant } = requestedTenant
      ? await tenantQuery.maybeSingle()
      : await tenantQuery.maybeSingle()

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

      await serviceSupabase
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
    const errorMessage = error instanceof Error ? error.message : 'Error al conectar con Stripe'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return createConnectLink(request)
}

export async function GET(request: NextRequest) {
  return createConnectLink(request, request.nextUrl.searchParams.get('tenantId') || request.nextUrl.searchParams.get('domain'))
}
