import { NextRequest, NextResponse } from 'next/server'

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.eccofoodapp\.com$/, '')
    .replace(/[^a-z0-9-]/g, '')
}

export async function GET(request: NextRequest) {
  const slug = cleanSlug(request.nextUrl.searchParams.get('restaurant') || '')

  if (!slug) {
    return NextResponse.redirect(new URL('/android?manual=1&error=missing', request.url))
  }

  const response = NextResponse.redirect(new URL(`/${slug}/acceso`, request.url))
  response.cookies.set('eccofood_android_tenant_slug', slug, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  return response
}
