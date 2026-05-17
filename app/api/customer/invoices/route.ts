import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPlanMonthlyPrice } from '@/lib/subscription-pricing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
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

    // Verify tenant exists
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, subscription_plan, created_at')
      .eq('id', tenantId)
      .single()

    if (fetchError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Generate mock invoices based on tenant's subscription history
    // In production, this would fetch from Stripe API or your billing database
    const invoices = []
    const price = getPlanMonthlyPrice(tenant.subscription_plan || 'basic') || 49.99

    // Generate invoices for the last 6 months
    const today = new Date()
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 26)
      const dueDate = new Date(date.getFullYear(), date.getMonth() + 1, 26)

      // Determine status: past invoices are paid, current and future might be pending
      let status: 'paid' | 'pending' | 'failed' = 'paid'
      if (dueDate > today) {
        status = 'pending'
      }

      invoices.push({
        id: `INV-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${tenant.id.slice(0, 8)}`,
        date: date.toISOString(),
        dueDate: dueDate.toISOString(),
        amount: price,
        plan: tenant.subscription_plan || 'Básico',
        status,
        description: `Suscripción ${new Date(date).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`,
      })
    }

    return NextResponse.json({
      invoices: invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      total: invoices.length,
    })
  } catch (error) {
    console.error('Invoices error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
