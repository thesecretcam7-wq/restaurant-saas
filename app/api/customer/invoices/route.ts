import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

function mapStripeInvoiceStatus(status: Stripe.Invoice.Status | null): 'paid' | 'pending' | 'failed' {
  if (status === 'paid') return 'paid'
  if (status === 'uncollectible' || status === 'void') return 'failed'
  return 'pending'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
    }

    await requireTenantAccess(tenantId, { staffRoles: [] })

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

    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, subscription_plan, created_at, stripe_customer_id')
      .eq('id', tenantId)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (!tenant.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ invoices: [], total: 0, source: 'stripe' })
    }

    const stripe = getStripe()
    const stripeInvoices = await stripe.invoices.list({
      customer: tenant.stripe_customer_id,
      limit: 24,
    })

    const invoices = stripeInvoices.data.map((invoice) => {
      const total = invoice.total ?? invoice.amount_paid ?? invoice.amount_due ?? 0
      const dueDate = invoice.due_date || invoice.status_transitions?.paid_at || invoice.created

      return {
        id: invoice.number || invoice.id,
        date: new Date(invoice.created * 1000).toISOString(),
        dueDate: new Date(dueDate * 1000).toISOString(),
        amount: total / 100,
        currency: invoice.currency?.toUpperCase() || 'EUR',
        plan: tenant.subscription_plan || 'basic',
        status: mapStripeInvoiceStatus(invoice.status),
        description: invoice.description || `Suscripcion ${tenant.subscription_plan || 'Eccofood'}`,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
      }
    })

    return NextResponse.json({
      invoices: invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      total: invoices.length,
      source: 'stripe',
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Invoices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
