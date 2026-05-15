import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { encryptServerSecret } from '@/lib/server-secret-box'
import {
  getPaymentConfig,
  mergePaymentConfigIntoPrinterSettings,
  selectSettingsWithPaymentFallback,
} from '@/lib/payment-settings'

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

function isMissingDeliveryZonesColumn(error: any) {
  const message = String(error?.message || error?.details || '')
  return error?.code === '42703' || message.includes('delivery_zones')
}

function normalizeDeliveryZones(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((zone, index) => {
      const raw = zone && typeof zone === 'object' ? zone as Record<string, unknown> : {}
      const name = String(raw.name || '').trim()
      const fee = toDecimal(raw.fee)
      const minOrder = toDecimal(raw.min_order, 0)
      if (!name || isNaN(fee) || fee < 0 || isNaN(minOrder) || minOrder < 0) return null
      return {
        id: String(raw.id || `zone-${index + 1}`).trim() || `zone-${index + 1}`,
        name,
        fee,
        min_order: minOrder,
      }
    })
    .filter(Boolean)
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

    const { data: tenant } = await supabase
      .from('tenants')
      .select('organization_name, country')
      .eq('id', tenantId)
      .maybeSingle()

    const existingResult = await selectSettingsWithPaymentFallback(
      supabase,
      tenantId,
      'display_name, country, delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, delivery_zones, cash_payment_enabled, tax_rate, printer_settings, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key, wompi_private_key, wompi_integrity_key',
      'display_name, country, delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, printer_settings'
    )

    if (existingResult.error) {
      console.error('Error reading delivery settings before update:', existingResult.error)
      return NextResponse.json({ error: 'No pude leer la configuracion actual del restaurante' }, { status: 500 })
    }

    const existingSettings = existingResult.data
    const existingPayment = getPaymentConfig(existingSettings, tenant?.country || 'ES')

    const country = normalizeCountry(data.country, existingPayment.country || tenant?.country || 'ES')
    const onlinePaymentProvider = normalizeProvider(data.online_payment_provider)
    const wompiEnabled = Boolean(data.wompi_enabled)

    if ((onlinePaymentProvider === 'wompi' || wompiEnabled) && country !== 'CO') {
      return NextResponse.json({ error: 'Wompi solo esta disponible para restaurantes de Colombia' }, { status: 400 })
    }

    const wompiPublicKey = String(data.wompi_public_key || '').trim()
    const rawWompiPrivateKey = String(data.wompi_private_key || '').trim()
    const rawWompiIntegrityKey = String(data.wompi_integrity_key || '').trim()
    const rawWompiEventKey = String(data.wompi_event_key || '').trim()

    if (rawWompiPrivateKey && !/^prv_(test|prod)_/.test(rawWompiPrivateKey)) {
      return NextResponse.json({ error: 'La llave privada de Wompi debe empezar por prv_test_ o prv_prod_.' }, { status: 400 })
    }
    if (rawWompiIntegrityKey && !/^(test|prod)_integrity_/.test(rawWompiIntegrityKey)) {
      return NextResponse.json({ error: 'La llave de integridad debe empezar por test_integrity_ o prod_integrity_. No pegues aqui la clave de eventos.' }, { status: 400 })
    }
    if (rawWompiEventKey && !/^(test|prod)_events_/.test(rawWompiEventKey)) {
      return NextResponse.json({ error: 'La clave de evento debe empezar por test_events_ o prod_events_.' }, { status: 400 })
    }

    const wompiPrivateKey = String(data.wompi_private_key || '').trim()
      ? encryptServerSecret(rawWompiPrivateKey)
      : existingPayment.wompi_private_key || ''
    const wompiIntegrityKey = String(data.wompi_integrity_key || '').trim()
      ? encryptServerSecret(rawWompiIntegrityKey)
      : existingPayment.wompi_integrity_key || ''
    const wompiEventKey = String(data.wompi_event_key || '').trim()
      ? encryptServerSecret(rawWompiEventKey)
      : existingPayment.wompi_event_key || ''

    if (country === 'CO' && onlinePaymentProvider === 'wompi' && wompiEnabled) {
      if (!wompiPublicKey || !wompiPrivateKey || !wompiIntegrityKey) {
        return NextResponse.json({ error: 'Para activar Wompi necesitas llave publica, privada e integridad.' }, { status: 400 })
      }
    }

    const paymentPayload = {
      online_payment_provider: onlinePaymentProvider,
      wompi_enabled: country === 'CO' ? wompiEnabled : false,
      wompi_environment: normalizeWompiEnvironment(data.wompi_environment),
      wompi_public_key: wompiPublicKey || null,
      wompi_private_key: wompiPrivateKey || null,
      wompi_integrity_key: wompiIntegrityKey || null,
      wompi_event_key: wompiEventKey || null,
    }

    const settingsPayload: Record<string, any> = {
      tenant_id: tenantId,
      display_name: existingSettings?.display_name || tenant?.organization_name || 'Restaurante',
      country,
      delivery_enabled: data.delivery_enabled,
      delivery_fee: deliveryFee || 0,
      delivery_min_order: deliveryMinOrder || 0,
      delivery_time_minutes: deliveryTimeMinutes || 30,
      delivery_zones: normalizeDeliveryZones(data.delivery_zones),
      cash_payment_enabled: data.cash_payment_enabled,
      tax_rate: taxRate || 0,
      printer_settings: mergePaymentConfigIntoPrinterSettings(existingSettings?.printer_settings, paymentPayload),
      updated_at: new Date().toISOString(),
    }

    if (existingResult.hasPaymentColumns) {
      Object.assign(settingsPayload, paymentPayload)
    }

    const updatedSelect = existingResult.hasPaymentColumns
      ? 'tenant_id, country, delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, delivery_zones, cash_payment_enabled, tax_rate, printer_settings, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key, wompi_private_key, wompi_integrity_key'
      : 'tenant_id, country, delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, printer_settings'

    const { data: updated, error } = await supabase
      .from('restaurant_settings')
      .upsert(settingsPayload, { onConflict: 'tenant_id' })
      .select(updatedSelect)
      .single()

    if (error) {
      console.error('Error updating delivery settings:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      if (isMissingDeliveryZonesColumn(error)) {
        return NextResponse.json(
          { error: 'Falta aplicar la migracion de zonas de delivery en Supabase. Pega el SQL que te dio Codex y vuelve a guardar.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: error.message || 'Error al guardar los cambios' }, { status: 500 })
    }

    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ country, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (tenantError) {
      console.warn('Could not sync tenant country from delivery settings:', tenantError)
    }

    const updatedPayment = getPaymentConfig(updated, country)

    return NextResponse.json({
      success: true,
      data: updated ? {
        ...(updated as Record<string, any>),
        ...updatedPayment,
        wompi_private_key: undefined,
        wompi_integrity_key: undefined,
        wompi_event_key: undefined,
        wompi_has_private_key: Boolean(updatedPayment.wompi_private_key),
        wompi_has_integrity_key: Boolean(updatedPayment.wompi_integrity_key),
        wompi_has_event_key: Boolean(updatedPayment.wompi_event_key),
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

    const { data, error } = await selectSettingsWithPaymentFallback(
      supabase,
      tenantId,
      'delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, delivery_zones, cash_payment_enabled, tax_rate, country, printer_settings, online_payment_provider, wompi_enabled, wompi_environment, wompi_public_key, wompi_private_key, wompi_integrity_key',
      'delivery_enabled, delivery_fee, delivery_min_order, delivery_time_minutes, cash_payment_enabled, tax_rate, country, printer_settings'
    )

    if (error) return NextResponse.json({ error: 'Error al obtener la configuracion' }, { status: 500 })
    const paymentConfig = getPaymentConfig(data, tenant?.country || 'ES')
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        delivery_enabled: data?.delivery_enabled ?? false,
        delivery_fee: data?.delivery_fee ?? 0,
        delivery_min_order: data?.delivery_min_order ?? 0,
        delivery_time_minutes: data?.delivery_time_minutes ?? 30,
        delivery_zones: Array.isArray((data as any)?.delivery_zones) ? (data as any).delivery_zones : [],
        cash_payment_enabled: data?.cash_payment_enabled ?? true,
        tax_rate: data?.tax_rate ?? 0,
        country: paymentConfig.country || tenant?.country || 'ES',
        online_payment_provider: paymentConfig.online_payment_provider,
        wompi_enabled: paymentConfig.wompi_enabled,
        wompi_environment: paymentConfig.wompi_environment,
        wompi_public_key: paymentConfig.wompi_public_key,
        wompi_private_key: undefined,
        wompi_integrity_key: undefined,
        wompi_event_key: undefined,
        wompi_has_private_key: Boolean(paymentConfig.wompi_private_key),
        wompi_has_integrity_key: Boolean(paymentConfig.wompi_integrity_key),
        wompi_has_event_key: Boolean(paymentConfig.wompi_event_key),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
