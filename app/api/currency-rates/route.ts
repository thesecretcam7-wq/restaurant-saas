import { NextRequest, NextResponse } from 'next/server'

// Tasas de cambio fijas (en producción, usar API real como exchangerate-api.com)
const EXCHANGE_RATES: Record<string, number> = {
  'EUR': 1.0,
  'USD': 1.08,      // 1 EUR = 1.08 USD
  'COP': 4400,      // 1 EUR = 4400 COP (aprox)
  'MXN': 18.5,      // 1 EUR = 18.5 MXN
  'ARS': 900,       // 1 EUR = 900 ARS
  'BRL': 5.2,       // 1 EUR = 5.2 BRL
  'GBP': 0.86,      // 1 EUR = 0.86 GBP
  'CHF': 0.95,      // 1 EUR = 0.95 CHF
  'AUD': 1.65,      // 1 EUR = 1.65 AUD
  'CAD': 1.47,      // 1 EUR = 1.47 CAD
  'NZD': 1.80,
  'CLP': 1040,
  'PEN': 4.05,
  'VES': 39,
  'SEK': 11.2,
  'NOK': 11.4,
  'DKK': 7.46,
  'PLN': 4.3,
  'CZK': 24.7,
  'RON': 4.98,
  'TRY': 35,
  'UAH': 43,
  'RUB': 100,
  'SAR': 4.05,
  'AED': 3.97,
  'SGD': 1.45,
  'HKD': 8.45,
  'THB': 39,
  'VND': 27500,
  'PHP': 61,
  'IDR': 17200,
  'MYR': 5.05,
  'ZAR': 20,
  'EGP': 52,
  'JPY': 160,       // 1 EUR = 160 JPY
  'CNY': 7.8,       // 1 EUR = 7.8 CNY
  'INR': 90,        // 1 EUR = 90 INR
}

// Mapeo de país a moneda (código ISO)
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'US': 'USD', 'GB': 'GBP', 'CA': 'CAD', 'AU': 'AUD', 'NZ': 'NZD',
  'JP': 'JPY', 'CN': 'CNY', 'IN': 'INR', 'BR': 'BRL', 'MX': 'MXN',
  'AR': 'ARS', 'CL': 'CLP', 'PE': 'PEN', 'CO': 'COP', 'VE': 'VES',
  'ES': 'EUR', 'FR': 'EUR', 'DE': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
  'BE': 'EUR', 'AT': 'EUR', 'GR': 'EUR', 'PT': 'EUR', 'CH': 'CHF',
  'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'PL': 'PLN', 'CZ': 'CZK',
  'RO': 'RON', 'TR': 'TRY', 'UA': 'UAH', 'RU': 'RUB', 'SA': 'SAR',
  'AE': 'AED', 'SG': 'SGD', 'HK': 'HKD', 'TH': 'THB', 'VN': 'VND',
  'PH': 'PHP', 'ID': 'IDR', 'MY': 'MYR', 'ZA': 'ZAR', 'EG': 'EGP',
}

// Símbolos de moneda
const CURRENCY_SYMBOLS: Record<string, string> = {
  'EUR': '€',
  'USD': '$',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'COP': '$',
  'MXN': '$',
  'BRL': 'R$',
  'ARS': '$',
  'CHF': 'Fr',
  'AUD': 'A$',
  'CAD': 'C$',
  'CLP': '$',
  'PEN': 'S/',
  'VES': 'Bs',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'PLN': 'PLN',
  'CZK': 'CZK',
  'RON': 'RON',
  'TRY': 'TRY',
  'UAH': 'UAH',
  'RUB': 'RUB',
  'SAR': 'SAR',
  'AED': 'AED',
  'SGD': 'S$',
  'HKD': 'HK$',
  'THB': 'THB',
  'VND': 'VND',
  'PHP': 'PHP',
  'IDR': 'Rp',
  'MYR': 'RM',
  'ZAR': 'R',
  'EGP': 'EGP',
  'NZD': 'NZ$',
  'INR': '₹',
}

const CURRENCY_NAMES: Record<string, string> = {
  'EUR': 'Euro',
  'USD': 'Dólar estadounidense',
  'GBP': 'Libra esterlina',
  'JPY': 'Yen japonés',
  'CNY': 'Yuan chino',
  'COP': 'Peso colombiano',
  'MXN': 'Peso mexicano',
  'BRL': 'Real brasileño',
  'ARS': 'Peso argentino',
  'CHF': 'Franco suizo',
  'AUD': 'Dólar australiano',
  'CAD': 'Dólar canadiense',
  'NZD': 'Dólar neozelandés',
  'INR': 'Rupia india',
  'CLP': 'Peso chileno',
  'PEN': 'Sol peruano',
  'VES': 'Bolivar venezolano',
  'SEK': 'Corona sueca',
  'NOK': 'Corona noruega',
  'DKK': 'Corona danesa',
  'PLN': 'Zloty polaco',
  'CZK': 'Corona checa',
  'RON': 'Leu rumano',
  'TRY': 'Lira turca',
  'UAH': 'Grivna ucraniana',
  'RUB': 'Rublo ruso',
  'SAR': 'Rial saudi',
  'AED': 'Dirham emiratos',
  'SGD': 'Dolar singapurense',
  'HKD': 'Dolar hongkones',
  'THB': 'Baht tailandes',
  'VND': 'Dong vietnamita',
  'PHP': 'Peso filipino',
  'IDR': 'Rupia indonesia',
  'MYR': 'Ringgit malayo',
  'ZAR': 'Rand sudafricano',
  'EGP': 'Libra egipcia',
}

interface CurrencyResponse {
  countryCode: string
  currency: string
  symbol: string
  name: string
  rate: number
  rates: Record<string, number>
}

export async function GET(request: NextRequest): Promise<NextResponse<CurrencyResponse | { error: string }>> {
  try {
    // Obtener país del header de Vercel o IP
    const countryCode = request.headers.get('x-vercel-ip-country') ||
                       request.headers.get('cf-ipcountry') ||
                       'US' // Default a US

    const currency = COUNTRY_TO_CURRENCY[countryCode] || 'USD'
    const rate = EXCHANGE_RATES[currency] || EXCHANGE_RATES['USD']
    const symbol = CURRENCY_SYMBOLS[currency] || currency
    const name = CURRENCY_NAMES[currency] || currency

    return NextResponse.json({
      countryCode,
      currency,
      symbol,
      name,
      rate,
      rates: EXCHANGE_RATES,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get currency rates' },
      { status: 500 }
    )
  }
}
