import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { tenantId, planName } = await request.json()

    if (!tenantId || !planName) {
      return NextResponse.json(
        { error: 'Missing tenantId or planName' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    // Accept both UUID and slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq(isUUID ? 'id' : 'slug', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get subscription plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    const stripe = getStripe()
    let customerId: string

    // Create or get Stripe customer
    if (tenant.stripe_customer_id) {
      customerId = tenant.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: tenant.owner_email,
        metadata: {
          tenant_id: tenant.id,
        },
      })
      customerId = customer.id

      // Save customer ID
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenantId)
    }

    // Build redirect URLs from request origin to avoid env var misconfiguration
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || `https://eccofood.vercel.app`
    const baseUrl = origin.endsWith('/') ? origin.slice(0, -1) : origin

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.stripe_price_id!,
          quantity: 1,
        },
      ],
      // Propagate metadata to the subscription object so customer.subscription.* events have tenant_id
      subscription_data: {
        metadata: {
          tenant_id: tenant.id,
          plan_name: planName,
        },
      },
      success_url: `${baseUrl}/${tenant.slug}/admin/dashboard`,
      cancel_url: `${baseUrl}/${tenant.slug}/admin/configuracion/planes`,
      metadata: {
        tenant_id: tenant.id,
        plan_name: planName,
      },
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
