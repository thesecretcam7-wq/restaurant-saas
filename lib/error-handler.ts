import { NextResponse } from 'next/server'

/**
 * Sanitize error messages to prevent information disclosure
 * Log full error internally, return generic message to client
 */

export interface SafeError {
  message: string
  statusCode: number
  userMessage: string
}

/**
 * Convert any error to a safe response
 * Logs internal details but returns generic message to user
 */
export function handleError(error: unknown, context: string): SafeError {
  const isDevelopment = process.env.NODE_ENV === 'development'
  let message = 'Internal server error'
  let statusCode = 500
  let userMessage = 'Error interno del servidor'

  if (error instanceof Error) {
    message = error.message

    // Log full error internally
    console.error(`[${context}] Error:`, {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    })

    // Determine appropriate user-facing message
    if (message.includes('Unauthorized')) {
      statusCode = 401
      userMessage = 'No autorizado'
    } else if (message.includes('Forbidden')) {
      statusCode = 403
      userMessage = 'Acceso denegado'
    } else if (message.includes('not found')) {
      statusCode = 404
      userMessage = 'No encontrado'
    } else if (message.includes('already exists')) {
      statusCode = 409
      userMessage = 'El recurso ya existe'
    } else if (message.includes('validation')) {
      statusCode = 400
      userMessage = 'Datos inválidos'
    }
  } else {
    console.error(`[${context}] Unknown error:`, error)
  }

  return {
    message,
    statusCode,
    // In production, always return generic message
    // In development, return actual error for debugging
    userMessage: isDevelopment ? message : userMessage,
  }
}

/**
 * Send safe error response
 */
export function sendSafeError(error: unknown, context: string): NextResponse {
  const { statusCode, userMessage } = handleError(error, context)

  return NextResponse.json(
    { error: userMessage },
    { status: statusCode }
  )
}

/**
 * Sensitive patterns that should never be logged or exposed
 */
const SENSITIVE_PATTERNS = [
  /sk_[a-zA-Z0-9_]+/g, // Stripe secret keys
  /ph_[a-zA-Z0-9_]+/g, // Auth tokens
  /Bearer [a-zA-Z0-9\-._~+/]+=*/g, // JWT tokens
  /password[\s]*[:=][\s]*[^\s]+/gi, // Passwords
  /api[_-]?key[\s]*[:=][\s]*[^\s]+/gi, // API keys
]

/**
 * Redact sensitive data from error messages
 */
export function redactSensitiveData(text: string): string {
  let redacted = text
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]')
  }
  return redacted
}

/**
 * Log security event (auth failure, unusual activity)
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  const timestamp = new Date().toISOString()
  const redactedDetails = {
    ...details,
    ...(details.userId && { userId: details.userId.substring(0, 8) + '...' }),
  }

  console.warn(`[SECURITY-${severity.toUpperCase()}] ${timestamp}`, {
    event,
    details: redactedDetails,
  })

  // TODO: Send to security monitoring service (e.g., Sentry, DataDog)
}
