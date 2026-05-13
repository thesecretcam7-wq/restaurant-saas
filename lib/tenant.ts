import { Tenant, TenantBranding, RestaurantSettings } from './types'
import { createServiceClient } from './supabase/server'
import { getLockedTenantBrandingColors } from './brand-colors'

type CacheEntry<T> = { value: T; expiresAt: number }
const cache = new Map<string, CacheEntry<unknown>>()
const CACHE_TTL = 3_000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: string) {
  return UUID_RE.test(value)
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && entry.expiresAt > Date.now()) return entry.value

  const value = await fetcher()
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL })
  return value
}

export async function getTenantByDomain(domain: string) {
  const cleanDomain = domain.split(':')[0]?.toLowerCase() || domain.toLowerCase()
  return cached(`tenant:domain:${cleanDomain}`, async () => {
  const supabase = createServiceClient()
  const candidates = cleanDomain.startsWith('www.')
    ? [cleanDomain, cleanDomain.slice(4)]
    : [cleanDomain, `www.${cleanDomain}`]

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .in('primary_domain', candidates)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data as Tenant
  })
}

export async function getTenantById(tenantId: string) {
  return cached(`tenant:id:${tenantId}`, async () => {
  if (!isUuid(tenantId)) return null

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data as Tenant
  })
}

export async function getTenantBranding(tenantId: string) {
  return cached(`branding:${tenantId}`, async () => {
  try {
    const supabase = createServiceClient()

    const [brandingRes, tenantRes] = await Promise.all([
      supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabase
        .from('tenants')
        .select('metadata, logo_url')
        .eq('id', tenantId)
        .maybeSingle(),
    ])

    if (brandingRes.error) {
      console.error('Error fetching branding:', brandingRes.error)
      return null
    }

    const metadataBranding = (tenantRes.data?.metadata || {}) as Record<string, any>
    const lockedBrandingColors = getLockedTenantBrandingColors()
    return {
      ...(metadataBranding || {}),
      ...(brandingRes.data || {}),
      logo_url: tenantRes.data?.logo_url || metadataBranding.logo_url || null,
      ...lockedBrandingColors,
    } as TenantBranding
  } catch (error) {
    console.error('Exception in getTenantBranding:', error)
    return null
  }
  })
}

export async function getRestaurantSettings(tenantId: string) {
  return cached(`settings:${tenantId}`, async () => {
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching settings:', error)
      return null
    }

    return data as RestaurantSettings
  } catch (error) {
    console.error('Exception in getRestaurantSettings:', error)
    return null
  }
  })
}

export async function getTenantBySlug(slug: string) {
  return cached(`tenant:slug:${slug}`, async () => {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('Error fetching tenant by slug:', error)
    return null
  }

  return data as Tenant
  })
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
  return cached(`context:${tenantIdOrSlug}`, async () => {
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
  })
}
