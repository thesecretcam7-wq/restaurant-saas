import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

type SupabaseClient = ReturnType<typeof createServiceClient>

function toDecimal(value: unknown, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : NaN
}

function normalizeProvider(value: unknown) {
  const provider = String(value || 'stripe').toLowerCase()
  return ['stripe', 'wompi', 'none'].includes(provider) ? provider : 'stripe'
}

function normalizeWompiEnvironment(value: unknown) {
  return String(value || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'
}

function normalizeCountry(value: unknown, fallback = 'ES') {
  const country = String(value || fallback || 'ES').trim().toUpperCase()
  return ['ES', 'CO', 'MX', 'US', 'AR', 'PE', 'CL'].includes(country) ? country : 'ES'
}

async function resolveTenantId(supabase: SupabaseClient, slugOrId: string): Promise<string | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidRegex.test(slugOrId)) return slugOrId
  const { data } = await supabase.from('tenants').select('id').eq('slug', slugOrId).single()
  return data?.id ?? null
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId: slugOrId, ...data } = body

    if (!slugOrId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const deliveryFee = toDecimal(data.delivery_fee)
    const deliveryMinOrder = toDecimal(data.delivery_min_order)
    const deliveryTimeMinutes = toDecimal(data.delivery_time_minutes, 30)
    const taxRate = toDecimal(data.tax_rate)

    if (data.delivery_fee !== undefined && (isNaN(deliveryFee) || deliveryFee < 0)) {
      return NextResponse.json({ error: 'El costo de delivery debe ser un numero positivo' }, { status: 400 })
    }

    if (data.delivery_min_order !== undefined && (isNaN(deliveryMinOrder) || deliveryMinOrder < 0)) {
      return NextResponse.json({ error: 'El pedido minimo debe ser un numero positivo' }, { status: 400 })
    }

    if (data.delivery_time_minutes !== undefined && (isNaN(deliveryTimeMinutes) || deliveryTimeMinutes < 1)) {
      return NextResponse.json({ error: 'El tiempo de entrega debe ser al menos 1 minuto' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, slugOrId)
    if (!tenantId) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const { data: existingSettings } = await supabase
      .from('restaurant_settings')
      .select('display_name, country, wompi_private_key, wompi_integrity_key')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('organization_name, country')
      .eq('id', tenantId)
      .maybeSingle()

    const country = normalizeCountry(data.country, existingSettings?.country || tenant?.country || 'ES')
    const onlinePaymentProvider = normalizeProvider(data.online_payment_provider)
    const wompiEnabled = Boolean(data.wompi_enabled)

    if ((onlinePaymentProvider === 'wompi' || wompiEnabled) && country !== 'CO') {
      return NextResponse.json({ error: 'Wompi solo esta disponible para restaurantes de Colombia' }, { status: 400 })
    }

    const wompiPublicKey = String(data.wompi_public_key || '').trim()
    const wompiPrivateKey = String(data.wompi_private_key || '').trim() || existingSettings?.wompi_private_key || ''
    const wompiIntegrityKey = String(data.wompi_integrity_key || '').trim() || existingSettings?.wompi_integrity_key || ''

    if (country === 'CO' && onlinePaymentProvider === 'wompi' && wompiEnabled) {
      if (!wompiPublicKey || !wompiPrivateKey || !wompiIntegrityKey) {
        return NextResponse.json({ error: 'Para activar Wompi necesitas llave publica, privada e integridad.' }, { status: 400 })
      }
    }

    const { data: updated, error } = await supabase
      .from('restaurant_settings')
      .upsert({
        tenant_id: tenantId,
        display_name: existingSettings?.display_name || tenant?.organization_name || 'Restaurante',
        country,
        delivery_enabled: data.delivery_enabled,
        delivery_fee: deliveryFee || 0,
        delivery_min_order: deliveryMinOrder || 0,
        delivery_time_minutes: deliveryTimeMinutes || 30,
        cash_payment_enabled: data.cash_payment_enabled,
        tax_rate: taxRate || 0,
        online_payment_provider: onlinePaymentProvider,
        wompi_enabled: country === 'CO' ? wompiEnabled : false,
        wompi_environment: normalizeWompiEnvironment(data.wompi_environment),
        wompi_public_key: wompiPublicKey || null,
        wompi_private_key: wompiPrivateKey || null,
        wompi_integrity_key: wompiIntegrityKey || null,
        wompi_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id' })
      .select()
      .single()

    if (error) {
      console.error('Error updating delivery settings:', error)
      return NextResponse.json({ error: 'Error al guardar los cambios' }, { status: 500 })
    }

    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ country, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (tenantError) {
      console.warn('Could not sync tenant country from delivery settings:', tenantError)
    }

    return NextResponse.json({
      success: true,
      data: updated ? {
        ...updated,
        wompi_private_key: undefined,
        wompi_integrity_key: undefined,
        wompi_has_private_key: Boolean(updated.wompi_private_key),
        wompi_has_integrity_key: Boolean(updated.wompi_integrity_key),
      } : null,
      message: 'Configuracion de delivery actualizada',
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    console.error('Delivery API error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const slugOrId = request.nextUrl.searchParams.get('tenantId')
    if (!slugOrId) return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })

    const supabase = createServiceClient()
    const tenantId = await resolveTenantId(supabase, slugOrId)
    if (!tenantId) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

    const { data: tenant } = await supabase
      .from('tenants')
      .select('country')
      .eq('id', tenantId)
      .maybeSingle()

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, country, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key, wompi_private_key, wompi_integrity_key')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Error al obtener la configuracion' }, { status: 500 })
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        delivery_enabled: data?.delivery_enabled ?? false,
        delivery_fee: data?.delivery_fee ?? 0,
        delivery_min_order: data?.delivery_min_order ?? 0,
        delivery_time_minutes: data?.delivery_time_minutes ?? 30,
        cash_payment_enabled: data?.cash_payment_enabled ?? true,
        tax_rate: data?.tax_rate ?? 0,
        country: data?.country || tenant?.country || 'ES',
        online_payment_provider: data?.online_payment_provider ?? 'stripe',
        wompi_enabled: data?.wompi_enabled ?? false,
        wompi_environment: data?.wompi_environment ?? 'sandbox',
        wompi_public_key: data?.wompi_public_key ?? '',
        wompi_private_key: undefined,
        wompi_integrity_key: undefined,
        wompi_has_private_key: Boolean(data?.wompi_private_key),
        wompi_has_integrity_key: Boolean(data?.wompi_integrity_key),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
