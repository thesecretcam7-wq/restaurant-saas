import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  trialExpiringEmail,
  subscriptionExpiringEmail,
  subscriptionExpiredEmail,
} from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a valid cron request (check for authorization header in production)
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
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    let sentCount = 0
    let errorCount = 0

    // 1. Find trials expiring in 7 days
    const { data: expiringTrials } = await supabase
      .from('tenants')
      .select('id, organization_name, owner_email, trial_ends_at, status')
      .eq('status', 'trial')
      .gte('trial_ends_at', now.toISOString())
      .lte('trial_ends_at', sevenDaysFromNow.toISOString())
      .eq('trial_expiration_notified', false)

    if (expiringTrials) {
      for (const tenant of expiringTrials) {
        try {
          const daysRemaining = Math.ceil(
            (new Date(tenant.trial_ends_at!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          )

          const emailTemplate = trialExpiringEmail(
            tenant.organization_name,
            daysRemaining,
            tenant.trial_ends_at!
          )

          await sendEmail(tenant.owner_email, emailTemplate.subject, emailTemplate.html)

          // Mark as notified
          await supabase
            .from('tenants')
            .update({
              trial_expiration_notified: true,
              last_notification_sent_at: now.toISOString(),
            })
            .eq('id', tenant.id)

          sentCount++
        } catch (err) {
          console.error(`Error sending trial expiration email for ${tenant.id}:`, err)
          errorCount++
        }
      }
    }

    // 2. Find subscriptions expiring in 7 days
    const { data: expiringSubscriptions } = await supabase
      .from('tenants')
      .select('id, organization_name, owner_email, subscription_expires_at, subscription_plan, status')
      .eq('status', 'active')
      .gte('subscription_expires_at', now.toISOString())
      .lte('subscription_expires_at', sevenDaysFromNow.toISOString())
      .eq('subscription_expiration_notified', false)

    if (expiringSubscriptions) {
      for (const tenant of expiringSubscriptions) {
        try {
          const daysRemaining = Math.ceil(
            (new Date(tenant.subscription_expires_at!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          )

          const emailTemplate = subscriptionExpiringEmail(
            tenant.organization_name,
            tenant.subscription_plan || 'Básico',
            daysRemaining,
            tenant.subscription_expires_at!
          )

          await sendEmail(tenant.owner_email, emailTemplate.subject, emailTemplate.html)

          // Mark as notified
          await supabase
            .from('tenants')
            .update({
              subscription_expiration_notified: true,
              last_notification_sent_at: now.toISOString(),
            })
            .eq('id', tenant.id)

          sentCount++
        } catch (err) {
          console.error(`Error sending subscription expiration email for ${tenant.id}:`, err)
          errorCount++
        }
      }
    }

    // 3. Find expired subscriptions not yet notified
    const { data: expiredSubscriptions } = await supabase
      .from('tenants')
      .select('id, organization_name, owner_email, subscription_expires_at, subscription_plan')
      .lt('subscription_expires_at', now.toISOString())
      .eq('status', 'suspended')
      .eq('subscription_expiration_notified', false)
      .limit(50)

    if (expiredSubscriptions) {
      for (const tenant of expiredSubscriptions) {
        try {
          const emailTemplate = subscriptionExpiredEmail(
            tenant.organization_name,
            tenant.subscription_plan || 'Básico',
            tenant.subscription_expires_at!
          )

          await sendEmail(tenant.owner_email, emailTemplate.subject, emailTemplate.html)

          // Mark as notified
          await supabase
            .from('tenants')
            .update({
              subscription_expiration_notified: true,
              last_notification_sent_at: now.toISOString(),
            })
            .eq('id', tenant.id)

          sentCount++
        } catch (err) {
          console.error(`Error sending subscription expired email for ${tenant.id}:`, err)
          errorCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron job completed: ${sentCount} emails sent, ${errorCount} errors`,
      sentCount,
      errorCount,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
