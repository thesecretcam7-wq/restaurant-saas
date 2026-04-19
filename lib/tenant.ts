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
  try {
    const supabase = createServiceClient()

    // Fetch tenant with metadata instead of broken tenant_branding table
    const { data, error } = await supabase
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single()

    if (error) {
      console.error('Error fetching branding:', error)
      return null
    }

    // Return metadata as branding object
    return data?.metadata as TenantBranding
  } catch (error) {
    console.error('Exception in getTenantBranding:', error)
    return null
  }
}

export async function getRestaurantSettings(tenantId: string) {
  try {
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
  } catch (error) {
    console.error('Exception in getRestaurantSettings:', error)
    return null
  }
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

export async function getTenantIdFromSlug(slugOrId: string): Promise<string | null> {
  // Try as UUID first
  let tenant = await getTenantById(slugOrId)

  // If not found, try as slug
  if (!tenant) {
    tenant = await getTenantBySlug(slugOrId)
  }

  return tenant?.id || null
}

export async function getTenantContext(tenantIdOrSlug: string) {
  try {
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
  } catch (error) {
    console.error('Exception in getTenantContext:', error)
    return {
      tenant: null,
      branding: null,
      settings: null,
      isLoading: false,
    }
  }
}
