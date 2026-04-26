import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

async function trackWebhookEvent(supabase: any, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single()

  if (data) return true

  const { error } = await supabase
    .from('webhook_events')
    .insert({ stripe_event_id: eventId, processed_at: new Date().toISOString() })

  return !error
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  const stripe = getStripe()

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
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

  const isProcessed = await trackWebhookEvent(supabase, event.id)
  if (isProcessed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { tenant_id, order_id } = session.metadata || {}

        if (!order_id || !tenant_id) {
          console.warn('checkout.session.completed missing metadata:', { tenant_id, order_id })
          break
        }

        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', order_id)
          .eq('tenant_id', tenant_id)

        if (error) console.error('Error updating order:', error)
        break
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object as Stripe.PaymentIntent
        const { error } = await supabase
          .from('orders')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', intent.id)

        if (error) console.error('Error updating failed payment:', error)
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const status = account.charges_enabled ? 'verified' : 'pending'

        const { error } = await supabase
          .from('tenants')
          .update({ stripe_account_status: status })
          .eq('stripe_account_id', account.id)

        if (error) console.error('Error updating account status:', error)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        const tenant_id = subscription.metadata?.tenant_id
        if (!tenant_id) {
          console.warn('customer.subscription.created missing tenant_id')
          break
        }

        const plan = subscription.metadata?.plan_name ||
                     subscription.items.data[0]?.price?.nickname ||
                     'basic'

        const { error } = await supabase
          .from('tenants')
          .update({
            subscription_stripe_id: subscription.id,
            subscription_plan: plan,
            status: subscription.status === 'active' ? 'active' : 'suspended',
          })
          .eq('id', tenant_id)

        if (error) console.error('Error creating subscription:', error)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const tenant_id = subscription.metadata?.tenant_id
        if (!tenant_id) {
          console.warn('customer.subscription.updated missing tenant_id')
          break
        }

        const plan = subscription.metadata?.plan_name ||
                     subscription.items.data[0]?.price?.nickname ||
                     'basic'

        const isActive = subscription.status === 'active'
        const status = isActive ? 'active' : 'suspended'

        const { error } = await supabase
          .from('tenants')
          .update({
            subscription_stripe_id: subscription.id,
            subscription_plan: plan,
            status,
          })
          .eq('id', tenant_id)

        if (error) console.error('Error updating subscription:', error)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const tenant_id = subscription.metadata?.tenant_id
        if (!tenant_id) {
          console.warn('customer.subscription.deleted missing tenant_id')
          break
        }

        const { error } = await supabase
          .from('tenants')
          .update({
            status: 'suspended',
            subscription_plan: null,
            subscription_stripe_id: null,
          })
          .eq('id', tenant_id)

        if (error) console.error('Error deleting subscription:', error)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.customer) break

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single()

        if (tenant) {
          const { error } = await supabase
            .from('tenants')
            .update({ status: 'suspended' })
            .eq('id', tenant.id)
          if (error) console.error('Error updating tenant status on invoice failure:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.customer || !(invoice as any).subscription) break

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', invoice.customer)
          .single()

        if (tenant) {
          const { error } = await supabase
            .from('tenants')
            .update({ status: 'active' })
            .eq('id', tenant.id)
          if (error) console.error('Error updating tenant status on invoice success:', error)
        }
        break
      }
    }
  } catch (err) {
    console.error('Unexpected webhook processing error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
