import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  const stripe = getStripe()

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { tenant_id, order_id } = session.metadata || {}

      if (order_id) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', order_id)
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('stripe_payment_intent_id', intent.id)
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      const status = account.charges_enabled ? 'verified' : 'pending'

      await supabase
        .from('tenants')
        .update({ stripe_account_status: status })
        .eq('stripe_account_id', account.id)
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const tenant_id = subscription.metadata?.tenant_id
      if (!tenant_id) break

      const plan = subscription.items.data[0]?.price?.nickname || 'basic'
      await supabase
        .from('tenants')
        .update({
          subscription_stripe_id: subscription.id,
          subscription_plan: plan,
          status: subscription.status === 'active' ? 'active' : 'suspended',
        })
        .eq('id', tenant_id)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const tenant_id = subscription.metadata?.tenant_id
      if (!tenant_id) break

      await supabase
        .from('tenants')
        .update({ status: 'suspended', subscription_plan: null })
        .eq('id', tenant_id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
