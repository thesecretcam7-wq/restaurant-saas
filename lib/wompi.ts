import crypto from 'crypto'

export type WompiEnvironment = 'sandbox' | 'production'

export function getWompiApiBase(environment?: string | null) {
  return environment === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1'
}

export function getWompiCheckoutUrl() {
  return 'https://checkout.wompi.co/p/'
}

export function createWompiIntegritySignature(input: {
  reference: string
  amountInCents: number
  currency: string
  integrityKey: string
}) {
  const payload = `${input.reference}${input.amountInCents}${input.currency}${input.integrityKey}`
  return crypto.createHash('sha256').update(payload).digest('hex')
}

export function normalizeWompiStatus(status?: string | null) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'APPROVED') return 'paid'
  if (normalized === 'DECLINED' || normalized === 'VOIDED' || normalized === 'ERROR') return 'failed'
  return 'pending'
}
