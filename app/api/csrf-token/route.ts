import { NextResponse } from 'next/server'
import { generateCSRFToken, attachCSRFTokenToResponse } from '@/lib/csrf'

export async function GET() {
  const token = generateCSRFToken()
  const response = NextResponse.json({ token })
  return attachCSRFTokenToResponse(response, token)
}
