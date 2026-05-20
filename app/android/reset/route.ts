import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/android?manual=1', request.url))
  response.cookies.delete('eccofood_android_tenant_slug')
  return response
}
