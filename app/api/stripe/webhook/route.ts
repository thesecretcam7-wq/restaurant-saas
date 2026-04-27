import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

// Returns true if already processed (skip), false if new (proceed)
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

  // If unique constraint error, a concurrent request already inserted it
  if (error) return true

  return false
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

  const isDuplicate = await trackWebhookEvent(supabase, event.id)
  if (isDuplicate) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { tenant_id, plan_name, order_id } = session.metadata || {}

        // Subscription checkout — activate the tenant's plan
        if (session.mode === 'subscription' && tenant_id) {
          const plan = plan_name || 'basic'
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)

          const { error } = await supabase
            .from('tenants')
            .update({
              subscription_plan: plan,
              status: 'active',
              subscription_expires_at: expiresAt.toISOString(),
              subscription_stripe_id: session.subscription as string,
            })
            .eq('id', tenant_id)

          if (error) console.error('Error activating subscription on checkout:', error)
          break
        }

        // One-time payment checkout (order)
        if (!order_id || !tenant_id) {
          console.warn('checkout.session.completed missing metadata:', { tenant_id, order_id })
          break
        }

        const { data: updatedOrder, error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'confirmed',
            stripe_payment_intent_id: session.payment_intent as string,
          })
          .eq('id', order_id)
          .eq('tenant_id', tenant_id)
          .select('items, tenant_id')
          .single()

        if (error) { console.error('Error updating order:', error); break }

        // Create order_items so KDS receives the order immediately on payment.
        if (updatedOrder && Array.isArray(updatedOrder.items) && updatedOrder.items.length > 0) {
          const { count } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order_id)

          if ((count ?? 0) === 0) {
            const orderItemsData = updatedOrder.items.map((item: any) => ({
              order_id,
              tenant_id,
              menu_item_id: item.menu_item_id || null,
              name: item.name,
              quantity: item.qty ?? item.quantity ?? 1,
              price: item.price,
              notes: item.notes || null,
              status: 'pending',
            }))
            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
            if (itemsError) console.error('[webhook] order_items creation error:', itemsError.message)
          }
        }
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
          console.warn('customer.subscription.created missing tenant_id in subscription metadata')
          break
        }

        const plan = subscription.metadata?.plan_name ||
                     subscription.items.data[0]?.price?.nickname ||
                     'basic'

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        const { error } = await supabase
          .from('tenants')
          .update({
            subscription_stripe_id: subscription.id,
            subscription_plan: plan,
            status: subscription.status === 'active' ? 'active' : 'suspended',
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq('id', tenant_id)

        if (error) console.error('Error creating subscription:', error)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const tenant_id = subscription.metadata?.tenant_id
        if (!tenant_id) {
          console.warn('customer.subscription.updated missing tenant_id in subscription metadata')
          break
        }

        const plan = subscription.metadata?.plan_name ||
                     subscription.items.data[0]?.price?.nickname ||
                     'basic'

        const isActive = subscription.status === 'active'
        const status = isActive ? 'active' : 'suspended'

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        const { error } = await supabase
          .from('tenants')
          .update({
            subscription_stripe_id: subscription.id,
            subscription_plan: plan,
            status,
            subscription_expires_at: isActive ? expiresAt.toISOString() : null,
          })
          .eq('id', tenant_id)

        if (error) console.error('Error updating subscription:', error)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const tenant_id = subscription.metadata?.tenant_id
        if (!tenant_id) {
          console.warn('customer.subscription.deleted missing tenant_id in subscription metadata')
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
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30)

          const { error } = await supabase
            .from('tenants')
            .update({
              status: 'active',
              subscription_expires_at: expiresAt.toISOString(),
            })
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
