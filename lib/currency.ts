/**
 * Format a number as Colombian Peso (COP)
 * @param amount - The amount to format
 * @returns Formatted string with COP symbol (e.g., "$50.000")
 */
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format a number as Euro (EUR)
 * @param amount - The amount to format
 * @returns Formatted string with EUR symbol (e.g., "€50,00")
 */
export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a number as price display (default: COP for products)
 * @param amount - The amount to format
 * @param currency - Currency type: 'COP' or 'EUR' (default: 'COP')
 * @returns Formatted string
 */
export function formatPrice(amount: number, currency: 'COP' | 'EUR' = 'COP'): string {
  return currency === 'EUR' ? formatEUR(amount) : formatCOP(amount)
}

/**
 * Get currency info for a country code
 * @param countryCode - ISO country code (e.g., 'CO', 'US', 'MX')
 * @returns Currency info with code, symbol, and name
 */
export function getCurrencyByCountry(countryCode: string): {
  code: string
  symbol: string
  name: string
  locale: string
} {
  const normalizedCountry = String(countryCode || 'ES')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const countryAliases: Record<string, string> = {
    ESPANA: 'ES',
    SPAIN: 'ES',
    ESP: 'ES',
    COLOMBIA: 'CO',
    MEXICO: 'MX',
    USA: 'US',
    EEUU: 'US',
    'ESTADOS UNIDOS': 'US',
  }
  const lookupCountry = countryAliases[normalizedCountry] || normalizedCountry

  const currencyMap: Record<
    string,
    { code: string; symbol: string; name: string; locale: string }
  > = {
    // Americas
    US: { code: 'USD', symbol: '$', name: 'Dólar estadounidense', locale: 'en-US' },
    CA: { code: 'CAD', symbol: 'C$', name: 'Dólar canadiense', locale: 'en-CA' },
    MX: { code: 'MXN', symbol: '$', name: 'Peso mexicano', locale: 'es-MX' },
    CO: { code: 'COP', symbol: '$', name: 'Peso colombiano', locale: 'es-CO' },
    BR: { code: 'BRL', symbol: 'R$', name: 'Real brasileño', locale: 'pt-BR' },
    AR: { code: 'ARS', symbol: '$', name: 'Peso argentino', locale: 'es-AR' },
    CL: { code: 'CLP', symbol: '$', name: 'Peso chileno', locale: 'es-CL' },
    PE: { code: 'PEN', symbol: 'S/', name: 'Sol peruano', locale: 'es-PE' },
    VE: { code: 'VES', symbol: 'Bs', name: 'Bolívar venezolano', locale: 'es-VE' },

    // Europa
    ES: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'es-ES' },
    FR: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'fr-FR' },
    DE: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
    IT: { code: 'EUR', symbol: '€', name: 'Euro', locale: 'it-IT' },
    GB: { code: 'GBP', symbol: '£', name: 'Libra esterlina', locale: 'en-GB' },
    CH: { code: 'CHF', symbol: 'Fr', name: 'Franco suizo', locale: 'de-CH' },
    SE: { code: 'SEK', symbol: 'kr', name: 'Corona sueca', locale: 'sv-SE' },
    NO: { code: 'NOK', symbol: 'kr', name: 'Corona noruega', locale: 'no-NO' },
    DK: { code: 'DKK', symbol: 'kr', name: 'Corona danesa', locale: 'da-DK' },
    PL: { code: 'PLN', symbol: 'zł', name: 'Esloti polaco', locale: 'pl-PL' },

    // Asia
    JP: { code: 'JPY', symbol: '¥', name: 'Yen japonés', locale: 'ja-JP' },
    CN: { code: 'CNY', symbol: '¥', name: 'Yuan chino', locale: 'zh-CN' },
    IN: { code: 'INR', symbol: '₹', name: 'Rupia india', locale: 'en-IN' },
    TH: { code: 'THB', symbol: '฿', name: 'Baht tailandés', locale: 'th-TH' },
    SG: { code: 'SGD', symbol: 'S$', name: 'Dólar singapurense', locale: 'en-SG' },
    MY: { code: 'MYR', symbol: 'RM', name: 'Ringit malayo', locale: 'ms-MY' },
    ID: { code: 'IDR', symbol: 'Rp', name: 'Rupia indonesia', locale: 'id-ID' },
    PH: { code: 'PHP', symbol: '₱', name: 'Peso filipno', locale: 'fil-PH' },
    VN: { code: 'VND', symbol: '₫', name: 'Dong vietnamita', locale: 'vi-VN' },
    HK: { code: 'HKD', symbol: 'HK$', name: 'Dólar hongkonés', locale: 'zh-HK' },

    // Otros
    AU: { code: 'AUD', symbol: 'A$', name: 'Dólar australiano', locale: 'en-AU' },
    NZ: { code: 'NZD', symbol: 'NZ$', name: 'Dólar neozelandés', locale: 'en-NZ' },
    ZA: { code: 'ZAR', symbol: 'R', name: 'Rand sudafricano', locale: 'en-ZA' },
    EG: { code: 'EGP', symbol: '£', name: 'Libra egipcia', locale: 'ar-EG' },
    TR: { code: 'TRY', symbol: '₺', name: 'Lira turca', locale: 'tr-TR' },
    SA: { code: 'SAR', symbol: 'ر.س', name: 'Rial saudí', locale: 'ar-SA' },
    AE: { code: 'AED', symbol: 'د.إ', name: 'Dírham emiratí', locale: 'ar-AE' },
  }

  // Default a USD si no encuentra el país
  return currencyMap[lookupCountry] || currencyMap['ES']
}

/**
 * Format price with dynamic currency
 * @param amount - The amount to format
 * @param currencyCode - ISO currency code (e.g., 'USD', 'COP', 'EUR')
 * @param locale - Optional locale for formatting
 * @returns Formatted string
 */
export function formatPriceWithCurrency(
  amount: number,
  currencyCode: string = 'COP',
  locale: string = 'es-CO'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
      minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    }).format(amount)
  } catch (error) {
    // Fallback si el locale no es válido
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount)
  }
}
