import { createHmac, timingSafeEqual } from 'crypto'

interface StaffProofPayload {
  tenantId: string
  staffId: string
  role: string
  staffName: string
  exp: number
}

function getSecret() {
  const secret = process.env.CSRF_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('Missing server signing secret')
  return secret
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString('base64url')
}

function signPayload(payload: string) {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createStaffAuthProof(payload: Omit<StaffProofPayload, 'exp'>, ttlSeconds = 120) {
  const body = base64url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }))
  return `${body}.${signPayload(body)}`
}

export function verifyStaffAuthProof(token: string | undefined): StaffProofPayload | null {
  if (!token) return null

  const [body, signature] = token.split('.')
  if (!body || !signature) return null

  const expected = signPayload(body)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StaffProofPayload
    if (!payload.tenantId || !payload.staffId || !payload.role || !payload.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
