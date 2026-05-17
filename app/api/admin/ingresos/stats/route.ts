import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPlanMonthlyPrice } from '@/lib/subscription-pricing'
import { isOwnerEmail } from '@/lib/owner-auth'
import { createServiceClient } from '@/lib/supabase/server'

interface RevenueStats {
  totalRevenue: number
  activeSubscriptions: number
  expiredSubscriptions: number
  monthlyRevenue: number
  last30DaysRevenue: number
  churnRate: number
  upcomingExpirations: Array<{
    id: string
    organization_name: string
    owner_email: string
    subscription_expires_at: string
    subscription_plan: string | null
    daysUntilExpiration: number
  }>
  revenueByPlan: Array<{
    plan: string
    count: number
    revenue: number
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    activeCount: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(
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

    // Get current user
    const { data: { user } } = await authClient.auth.getUser()

    // Verify ownership
    if (!isOwnerEmail(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Fetch all active/paid subscriptions
    const { data: tenants } = await supabase
      .from('tenants')
      .select(`
        id,
        organization_name,
        owner_email,
        status,
        subscription_plan,
        subscription_expires_at,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (!tenants) {
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // Calculate stats
    const activeSubscriptions = tenants.filter(
      t => t.subscription_expires_at && new Date(t.subscription_expires_at) > now && t.subscription_plan && t.subscription_plan !== 'free'
    ).length

    const expiredSubscriptions = tenants.filter(
      t => t.subscription_expires_at && new Date(t.subscription_expires_at) <= now && t.subscription_plan && t.subscription_plan !== 'free'
    ).length

    // Revenue calculations
    let totalRevenue = 0
    let monthlyRevenue = 0
    let last30DaysRevenue = 0

    tenants.forEach(tenant => {
      if (tenant.subscription_plan && tenant.subscription_plan !== 'free') {
        const price = getPlanMonthlyPrice(tenant.subscription_plan)
        totalRevenue += price

        const expiresAt = new Date(tenant.subscription_expires_at || now)
        if (expiresAt > monthAgo) {
          monthlyRevenue += price
        }
        if (expiresAt > thirtyDaysAgo) {
          last30DaysRevenue += price
        }
      }
    })

    // Churn rate: expired subscriptions / (active + expired)
    const totalSubscriptions = activeSubscriptions + expiredSubscriptions
    const churnRate = totalSubscriptions > 0 ? (expiredSubscriptions / totalSubscriptions) * 100 : 0

    // Upcoming expirations (next 30 days)
    const upcomingExpirations = tenants
      .filter(t => {
        if (!t.subscription_expires_at || !t.subscription_plan || t.subscription_plan === 'free') return false
        const expiresAt = new Date(t.subscription_expires_at)
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        return daysUntil > 0 && daysUntil <= 30
      })
      .map(t => {
        const expiresAt = new Date(t.subscription_expires_at!)
        const daysUntil = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
        return {
          id: t.id,
          organization_name: t.organization_name,
          owner_email: t.owner_email,
          subscription_expires_at: t.subscription_expires_at!,
          subscription_plan: t.subscription_plan,
          daysUntilExpiration: daysUntil,
        }
      })
      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)

    // Revenue by plan
    const revenueByPlanMap = new Map<string, { count: number; revenue: number }>()
    tenants.forEach(tenant => {
      if (tenant.subscription_plan && tenant.subscription_plan !== 'free') {
        const price = getPlanMonthlyPrice(tenant.subscription_plan)
        const existing = revenueByPlanMap.get(tenant.subscription_plan) || { count: 0, revenue: 0 }
        existing.count += 1
        existing.revenue += price
        revenueByPlanMap.set(tenant.subscription_plan, existing)
      }
    })

    const revenueByPlan = Array.from(revenueByPlanMap.entries()).map(([plan, data]) => ({
      plan,
      ...data,
    }))

    // Monthly trend (last 6 months)
    const monthlyTrend: Array<{ month: string; revenue: number; activeCount: number }> = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = date.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })

      let monthRevenue = 0
      let activeCount = 0

      tenants.forEach(tenant => {
        if (tenant.subscription_plan && tenant.subscription_plan !== 'free' && tenant.subscription_expires_at) {
          const expiresAt = new Date(tenant.subscription_expires_at)
          const createdAt = new Date(tenant.created_at)

          if (createdAt.getFullYear() === date.getFullYear() && createdAt.getMonth() === date.getMonth()) {
            const price = getPlanMonthlyPrice(tenant.subscription_plan)
            monthRevenue += price
            if (expiresAt > now) activeCount += 1
          }
        }
      })

      monthlyTrend.push({
        month: monthStr,
        revenue: monthRevenue,
        activeCount,
      })
    }

    const stats: RevenueStats = {
      totalRevenue,
      activeSubscriptions,
      expiredSubscriptions,
      monthlyRevenue,
      last30DaysRevenue,
      churnRate: Math.round(churnRate * 100) / 100,
      upcomingExpirations,
      revenueByPlan,
      monthlyTrend,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Revenue stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
