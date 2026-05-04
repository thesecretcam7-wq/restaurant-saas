import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Verify cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const now = new Date()
    let retriedCount = 0
    let failedCount = 0
    let escalatedCount = 0

    // Find tenants with payment failures
    const { data: failedTenants } = await supabase
      .from('tenants')
      .select('id, owner_email, organization_name, stripe_customer_id, payment_failure_count, last_payment_failure_at')
      .gt('payment_failure_count', 0)
      .limit(50)

    if (failedTenants) {
      for (const tenant of failedTenants) {
        try {
          if (!tenant.stripe_customer_id) continue

          // Get the most recent failed invoice
          const stripe = getStripe()
          const invoices = await stripe.invoices.list(
            {
              customer: tenant.stripe_customer_id,
              status: 'open',
              limit: 1,
            },
            { apiKey: process.env.STRIPE_SECRET_KEY }
          )

          if (invoices.data.length === 0) {
            // No open invoices, reset failure count
            await supabase
              .from('tenants')
              .update({ payment_failure_count: 0, last_payment_failure_at: null })
              .eq('id', tenant.id)
            continue
          }

          const invoice = invoices.data[0]
          const createdAt = new Date(invoice.created * 1000)
          const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000))

          // Only retry invoices older than 1 day and less than 7 days
          if (daysSinceCreation < 1 || daysSinceCreation > 7) {
            continue
          }

          // Attempt to pay the invoice
          try {
            const paidInvoice = await stripe.invoices.pay(
              invoice.id,
              {},
              { apiKey: process.env.STRIPE_SECRET_KEY }
            )

            if (paidInvoice.status === 'paid') {
              // Payment successful, reset failure count
              await supabase
                .from('tenants')
                .update({
                  payment_failure_count: 0,
                  last_payment_failure_at: null,
                  status: 'active',
                })
                .eq('id', tenant.id)

              retriedCount++
            }
          } catch (paymentError) {
            // Retry failed
            const newFailureCount = (tenant.payment_failure_count || 0) + 1

            // If 3 failures, send escalation email (TODO: implement)
            if (newFailureCount >= 3) {
              console.log(`Payment escalation for tenant ${tenant.id} after ${newFailureCount} failures`)
              escalatedCount++
            }

            // Update tenant with new failure count
            await supabase
              .from('tenants')
              .update({
                payment_failure_count: newFailureCount,
                last_payment_failure_at: now.toISOString(),
              })
              .eq('id', tenant.id)

            failedCount++
          }
        } catch (err) {
          console.error(`Error processing payment retry for ${tenant.id}:`, err)
          failedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment retry job completed: ${retriedCount} successful, ${failedCount} still failing, ${escalatedCount} escalated`,
      retriedCount,
      failedCount,
      escalatedCount,
    })
  } catch (error) {
    console.error('Payment retry job error:', error)
    return NextResponse.json(
      { error: 'Job failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
