import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  }

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      ok: false,
      env,
      tenantFound: false,
      message: 'Faltan variables de Supabase en Vercel.',
    })
  }

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug, organization_name')
      .eq('slug', 'elbuenpaladar')
      .maybeSingle()

    return NextResponse.json({
      ok: !error && Boolean(data),
      env,
      tenantFound: Boolean(data),
      tenant: data ? { slug: data.slug, organization_name: data.organization_name } : null,
      error: error ? { message: error.message, code: error.code } : null,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      env,
      tenantFound: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    })
  }
}
