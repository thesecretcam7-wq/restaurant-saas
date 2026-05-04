import { NextResponse } from 'next/server'
import { generateCSRFToken, attachCSRFTokenToResponse } from '@/lib/csrf'

export async function GET() {
  const token = generateCSRFToken()
  const response = NextResponse.json({ token })
  response.headers.set('x-csrf-token', token)
  return attachCSRFTokenToResponse(response)
}
