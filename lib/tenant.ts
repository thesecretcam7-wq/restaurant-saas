import { Tenant, TenantBranding, RestaurantSettings } from './types'
import { createClient } from './supabase/server'

export async function getTenantByDomain(domain: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('primary_domain', domain)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data as Tenant
}

export async function getTenantById(tenantId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data as Tenant
}

export async function getTenantBranding(tenantId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tenant_branding')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching branding:', error)
    return null
  }

  return data as TenantBranding
}

export async function getRestaurantSettings(tenantId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('Error fetching settings:', error)
    return null
  }

  return data as RestaurantSettings
}

export async function getTenantContext(tenantId: string) {
  const [tenant, branding, settings] = await Promise.all([
    getTenantById(tenantId),
    getTenantBranding(tenantId),
    getRestaurantSettings(tenantId),
  ])

  return {
    tenant,
    branding,
    settings,
    isLoading: false,
  }
}
