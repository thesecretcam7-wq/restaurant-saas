import crypto from 'node:crypto'

const PREFIX = 'enc:v1:'

function getSecretKey() {
  const raw =
    process.env.WOMPI_ENCRYPTION_KEY ||
    process.env.SECRETS_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ''

  return crypto.createHash('sha256').update(raw).digest()
}

function getFallbackSecretKeys() {
  return [
    process.env.WOMPI_ENCRYPTION_KEY,
    process.env.SECRETS_ENCRYPTION_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .map(value => crypto.createHash('sha256').update(value).digest())
}

export function encryptServerSecret(value: string | null | undefined) {
  const plainText = String(value || '').trim()
  if (!plainText) return ''
  if (plainText.startsWith(PREFIX)) return plainText

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getSecretKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64url')}`
}

export function decryptServerSecret(value: string | null | undefined) {
  const storedValue = String(value || '').trim()
  if (!storedValue) return ''
  if (!storedValue.startsWith(PREFIX)) return storedValue

  try {
    const payload = Buffer.from(storedValue.slice(PREFIX.length), 'base64url')
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)
    for (const secretKey of getFallbackSecretKeys()) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv)
        decipher.setAuthTag(tag)
        return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
      } catch {}
    }
  } catch (error) {
    console.error('Could not decrypt server secret', error)
  }
  console.error('Could not decrypt server secret')
  return ''
}
