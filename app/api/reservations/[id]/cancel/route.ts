import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)
  const referer = request.headers.get('referer') || '/'
  return NextResponse.redirect(referer)
}
