import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrencyByCountry } from '@/lib/currency'
import { applyRecipeStockMovement } from '@/lib/inventory-recipes'
import { writeAuditLog } from '@/lib/audit-log'
import type { TenantAccess } from '@/lib/tenant-api-auth'

export const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!)

const ZERO_DECIMAL_STRIPE_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

export function toStripeMinorUnitAmount(amount: number, currencyCode: string) {
  const currency = currencyCode.toUpperCase()
  const multiplier = ZERO_DECIMAL_STRIPE_CURRENCIES.has(currency) ? 1 : 100
  return Math.round(amount * multiplier)
}

export function normalizeTenantLookup(value: string) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  return { column: isUUID ? 'id' : 'slug', value }
}

export async function resolveTerminalTenant(supabase: SupabaseClient, tenantParam: string) {
  const lookup = normalizeTenantLookup(tenantParam)
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, stripe_account_id, stripe_account_status, country')
    .eq(lookup.column, lookup.value)
    .single()

  if (error || !tenant) {
    throw new Error('TENANT_NOT_FOUND')
  }

  return tenant
}

export function assertTerminalReady(tenant: { stripe_account_id?: string | null; stripe_account_status?: string | null }) {
  if (!tenant.stripe_account_id || tenant.stripe_account_status !== 'verified') {
    throw new Error('STRIPE_NOT_READY')
  }
}

export async function getTenantCurrency(supabase: SupabaseClient, tenant: { id: string; country?: string | null }) {
  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('country')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  return getCurrencyByCountry(settings?.country || tenant.country || 'ES')
}

export async function markTerminalOrderPaid({
  supabase,
  order,
  paymentIntent,
  actor,
}: {
  supabase: SupabaseClient
  order: any
  paymentIntent: Stripe.PaymentIntent
  actor: TenantAccess
}) {
  if (order.payment_status !== 'paid') {
    try {
      await applyRecipeStockMovement(supabase, order, 'sale')
    } catch (stockError) {
      console.error('[terminal] stock deduction error:', stockError)
    }
  }

  const nextStatus = order.status === 'pending' ? 'confirmed' : order.status
  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      payment_method: 'stripe',
      status: nextStatus,
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .eq('tenant_id', order.tenant_id)
    .select()
    .single()

  if (error) throw error

  await writeAuditLog(supabase, {
    tenantId: order.tenant_id,
    actor,
    action: 'sale.terminal_paid',
    entityType: 'order',
    entityId: order.id,
    reason: 'Cobro presencial Tap to Pay',
    metadata: {
      order_number: order.order_number,
      payment_intent: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  })

  return updatedOrder
}
