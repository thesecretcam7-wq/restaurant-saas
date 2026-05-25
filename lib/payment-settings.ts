type PaymentColumnResult = {
  data: any
  error: any
  hasPaymentColumns: boolean
}

const PAYMENT_JSON_KEY = 'payment_settings'

function isMissingPaymentColumn(error: any) {
  const message = String(error?.message || '')
  return error?.code === '42703' || message.includes('online_payment_provider') || message.includes('wompi_')
}

export function getPaymentConfig(row: any, fallbackCountry = 'ES') {
  const jsonConfig = row?.printer_settings?.[PAYMENT_JSON_KEY] || {}
  const country = String(row?.country || jsonConfig.country || fallbackCountry || 'ES').toUpperCase()

  return {
    country,
    online_payment_provider: row?.online_payment_provider ?? jsonConfig.online_payment_provider ?? 'stripe',
    wompi_enabled: row?.wompi_enabled ?? jsonConfig.wompi_enabled ?? false,
    wompi_environment: row?.wompi_environment ?? jsonConfig.wompi_environment ?? 'sandbox',
    wompi_public_key: row?.wompi_public_key ?? jsonConfig.wompi_public_key ?? '',
    wompi_private_key: row?.wompi_private_key ?? jsonConfig.wompi_private_key ?? '',
    wompi_integrity_key: row?.wompi_integrity_key ?? jsonConfig.wompi_integrity_key ?? '',
    wompi_event_key: row?.wompi_event_key ?? jsonConfig.wompi_event_key ?? '',
  }
}

export function mergePaymentConfigIntoPrinterSettings(printerSettings: any, paymentConfig: Record<string, any>) {
  const existing = printerSettings && typeof printerSettings === 'object' && !Array.isArray(printerSettings)
    ? printerSettings
    : {}

  return {
    ...existing,
    [PAYMENT_JSON_KEY]: {
      ...(existing[PAYMENT_JSON_KEY] || {}),
      ...paymentConfig,
      updated_at: new Date().toISOString(),
    },
  }
}

export async function selectSettingsWithPaymentFallback(
  supabase: any,
  tenantId: string,
  fullSelect: string,
  fallbackSelect: string
): Promise<PaymentColumnResult> {
  const fullResult = await supabase
    .from('restaurant_settings')
    .select(fullSelect)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!fullResult.error) {
    return { data: fullResult.data, error: null, hasPaymentColumns: true }
  }

  if (!isMissingPaymentColumn(fullResult.error)) {
    return { data: fullResult.data, error: fullResult.error, hasPaymentColumns: true }
  }

  const fallbackResult = await supabase
    .from('restaurant_settings')
    .select(fallbackSelect)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  return {
    data: fallbackResult.data,
    error: fallbackResult.error,
    hasPaymentColumns: false,
  }
}
