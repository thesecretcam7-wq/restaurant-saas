import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { PAID_PLAN_IDS, PLAN_CATALOG, type PaidPlanId } from '@/lib/subscription-pricing'

export async function GET() {
  try {
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

    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('monthly_price', { ascending: true })

    if (error) {
      throw error
    }

    const paidPlans = (plans || [])
      .filter((plan) => PAID_PLAN_IDS.includes(plan.name as PaidPlanId))
      .sort((a, b) => PAID_PLAN_IDS.indexOf(a.name as PaidPlanId) - PAID_PLAN_IDS.indexOf(b.name as PaidPlanId))
      .map((plan) => {
        const planCopy = PLAN_CATALOG[plan.name as PaidPlanId]

        return {
          ...plan,
          monthly_price: planCopy.monthlyPrice,
          annual_price: planCopy.annualPrice,
          description: plan.description || planCopy.adminDescription,
        }
      })

    return NextResponse.json(paidPlans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription plans' },
      { status: 500 }
    )
  }
}
