import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServiceClient()
  await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', id)
  return NextResponse.redirect(new URL('/', _.url))
}
