import { NextResponse } from 'next/server'

/**
 * Security headers to add to all responses
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection in older browsers
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy - don't leak referrer to external sites
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy - restrict powerful APIs
  'Permissions-Policy':
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(self), magnetometer=(), gyroscope=(), accelerometer=()',

  // Content Security Policy - prevent XSS and injection attacks
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://csdooyggiuhzovehykna.supabase.co https://api.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // HTTPS enforcement
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
} as const

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value as string)
  })

  return response
}

/**
 * Get CSP for development (more permissive)
 */
export function getDevCSP(): string {
  return [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' 'unsafe-eval' data: https: blob:",
    "font-src 'self' https:",
    "connect-src 'self' https: ws: wss:",
  ].join('; ')
}

/**
 * Get CSP for production (strict)
 */
export function getProdCSP(): string {
  return SECURITY_HEADERS['Content-Security-Policy']
}
