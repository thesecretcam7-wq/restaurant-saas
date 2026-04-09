import { Tenant, TenantBranding, RestaurantSettings } from './types'
import { createServiceClient } from './supabase/server'

export async function getTenantByDomain(domain: string) {
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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
  const supabase = createServiceClient()

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

export async function getTenantBySlug(slug: string) {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    console.error('Error fetching tenant by slug:', error)
    return null
  }

  return data as Tenant
}

export async function getTenantIdFromSlug(slug: string): Promise<string | null> {
  const tenant = await getTenantBySlug(slug)
  return tenant?.id || null
}

export async function getTenantContext(tenantIdOrSlug: string) {
  // Intentar como UUID primero
  let tenant = await getTenantById(tenantIdOrSlug)

  // Si no es UUID válido, intentar como slug
  if (!tenant) {
    tenant = await getTenantBySlug(tenantIdOrSlug)
  }

  const tenantId = tenant?.id

  if (!tenantId) {
    return {
      tenant: null,
      branding: null,
      settings: null,
      isLoading: false,
    }
  }

  const [branding, settings] = await Promise.all([
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
