import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export type StripeConnectStatus = 'verified' | 'pending' | 'failed'

export function getStripeConnectStatus(account: Stripe.Account): StripeConnectStatus {
  if (account.charges_enabled) return 'verified'
  if (account.requirements?.disabled_reason) return 'pending'
  return 'pending'
}

export async function syncStripeConnectStatus({
  stripe,
  supabase,
  tenantId,
  stripeAccountId,
}: {
  stripe: Stripe
  supabase: SupabaseClient
  tenantId: string
  stripeAccountId: string
}) {
  const account = await stripe.accounts.retrieve(stripeAccountId)
  const status = getStripeConnectStatus(account)

  const { error } = await supabase
    .from('tenants')
    .update({ stripe_account_status: status })
    .eq('id', tenantId)

  if (error) throw error

  return { account, status }
}
