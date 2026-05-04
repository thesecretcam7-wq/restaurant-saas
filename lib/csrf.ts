import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'

/**
 * CSRF Token Management
 * Generates and validates CSRF tokens to prevent cross-site request forgery
 */

export interface CSRFConfig {
  headerName?: string
  paramName?: string
  secretKey?: string
}

const DEFAULT_CONFIG: CSRFConfig = {
  headerName: 'x-csrf-token',
  paramName: 'csrf_token',
}

/**
 * Generate a new CSRF token
 * Tokens are signed with a secret to prevent tampering
 */
export function generateCSRFToken(secret?: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const timestamp = Date.now().toString()

  // Create a signature to prevent tampering
  const signature = crypto
    .createHmac('sha256', secret || process.env.CSRF_SECRET || 'default-secret')
    .update(`${token}${timestamp}`)
    .digest('hex')

  return `${token}.${timestamp}.${signature}`
}

/**
 * Validate a CSRF token
 * Checks that the token is properly formatted and hasn't been tampered with
 */
export function validateCSRFToken(token: string, secret?: string): boolean {
  try {
    const [tokenPart, timestampStr, signaturePart] = token.split('.')

    if (!tokenPart || !timestampStr || !signaturePart) {
      return false
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret || process.env.CSRF_SECRET || 'default-secret')
      .update(`${tokenPart}${timestampStr}`)
      .digest('hex')

    if (signaturePart !== expectedSignature) {
      return false
    }

    // Check if token is not too old (24 hours)
    const timestamp = parseInt(timestampStr, 10)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    if (Date.now() - timestamp > maxAge) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Extract CSRF token from request
 * Checks both headers and body parameters
 */
export function extractCSRFToken(request: NextRequest, config: CSRFConfig = {}): string | null {
  const { headerName = DEFAULT_CONFIG.headerName, paramName = DEFAULT_CONFIG.paramName } = config

  // Check header first (more secure)
  const headerToken = request.headers.get(headerName!)
  if (headerToken) {
    return headerToken
  }

  // Check query parameters
  const queryToken = request.nextUrl.searchParams.get(paramName!)
  if (queryToken) {
    return queryToken
  }

  return null
}

/**
 * Middleware helper to verify CSRF tokens on state-changing requests
 * Should be used on POST, PATCH, DELETE endpoints
 */
export async function verifyCSRFToken(
  request: NextRequest,
  config: CSRFConfig = {}
): Promise<boolean> {
  // CSRF only applies to state-changing methods
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }

  const token = extractCSRFToken(request, config)
  if (!token) {
    console.warn(`[CSRF] Missing token for ${method} ${request.nextUrl.pathname}`)
    return false
  }

  return validateCSRFToken(token, config.secretKey)
}

/**
 * Send CSRF error response
 */
export function sendCSRFErrorResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Invalid or missing CSRF token. Request rejected for security reasons.' },
    { status: 403 }
  )
}

/**
 * Helper to set CSRF token in response headers/cookies
 * Client can then include it in subsequent requests
 */
export function attachCSRFTokenToResponse(response: NextResponse): NextResponse {
  const token = generateCSRFToken()

  // Set in response header so client can read it
  response.headers.set('x-csrf-token', token)

  // Also set in secure, httpOnly cookie (for verification)
  response.cookies.set('csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  })

  return response
}
