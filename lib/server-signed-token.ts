import { createHmac, timingSafeEqual } from 'node:crypto'

function secret() {
  const value = process.env.CSRF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('Missing server signing secret')
  return value
}
export function signServerValue(purpose: string, value: string) {
  return createHmac('sha256', secret()).update(purpose + '\0' + value).digest('base64url')
}
export function verifyServerValue(purpose: string, value: string, signature?: string) {
  if (!signature || signature.length > 128 || value.length > 16_384) return false
  const expected = Buffer.from(signServerValue(purpose, value))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
export function createDisplayGrant(tenantId: string, sessionId: string, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ tenantId, sessionId, exp: Math.floor(now / 1000) + 30 * 86400 })).toString('base64url')
  return body + '.' + signServerValue('pos-display-v1', body)
}
export function verifyDisplayGrant(token: string, now = Date.now()): { tenantId: string; sessionId: string } | null {
  if (token.length > 2048) return null
  const [body, signature, extra] = token.split('.')
  if (extra || !body || !verifyServerValue('pos-display-v1', body, signature)) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (typeof data.tenantId !== 'string' || typeof data.sessionId !== 'string' || !Number.isInteger(data.exp)
      || data.exp <= now / 1000 || data.exp > now / 1000 + 30 * 86400 + 1) return null
    return { tenantId: data.tenantId, sessionId: data.sessionId }
  } catch { return null }
}
export function displayTopic(tenantId: string, sessionId: string) {
  return 'cart-display:' + signServerValue('pos-display-topic-v1', tenantId + ':' + sessionId)
}
