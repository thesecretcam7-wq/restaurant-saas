import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { tenantId } = await request.json()
  if (!tenantId) return NextResponse.json({ error: 'Falta tenantId' }, { status: 400 })

  const res = NextResponse.json({ success: true })
  res.cookies.set('staff_session', tenantId, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('staff_session')
  return res
}
