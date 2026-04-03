import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

async function vercelRequest(method: string, path: string, body?: any) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  return res
}

// GET /api/tenant/domain?tenantId=xxx — obtiene dominio actual y su estado
export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

  const { data: tenant } = await supabase()
    .from('tenants')
    .select('primary_domain')
    .eq('id', tenantId)
    .single()

  if (!tenant?.primary_domain) {
    return NextResponse.json({ domain: null, status: 'none' })
  }

  // Si no hay Vercel token configurado, devolvemos solo lo de la BD
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json({ domain: tenant.primary_domain, status: 'unknown' })
  }

  // Verificar estado en Vercel
  const res = await vercelRequest('GET', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${tenant.primary_domain}`)
  if (!res.ok) {
    return NextResponse.json({ domain: tenant.primary_domain, status: 'not_added' })
  }

  const data = await res.json()
  const verified = data.verified === true
  const cname = data.apexName ? `cname.vercel-dns.com` : null

  return NextResponse.json({
    domain: tenant.primary_domain,
    status: verified ? 'verified' : 'pending',
    cname,
    verification: data.verification || [],
  })
}

// POST /api/tenant/domain — guarda dominio, lo registra en Vercel
export async function POST(request: NextRequest) {
  const { tenantId, domain } = await request.json()
  if (!tenantId || !domain) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  // Validar formato del dominio
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  if (!domainRegex.test(domain)) {
    return NextResponse.json({ error: 'Formato de dominio inválido' }, { status: 400 })
  }

  // Verificar que no esté siendo usado por otro tenant
  const { data: existing } = await supabase()
    .from('tenants')
    .select('id')
    .eq('primary_domain', domain)
    .neq('id', tenantId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Este dominio ya está siendo usado por otro restaurante' }, { status: 409 })
  }

  // Guardar en BD
  const { error: dbError } = await supabase()
    .from('tenants')
    .update({ primary_domain: domain })
    .eq('id', tenantId)

  if (dbError) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })

  // Registrar en Vercel si hay token
  let vercelStatus = 'saved'
  let verification: any[] = []
  let cname = 'cname.vercel-dns.com'

  if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
    const res = await vercelRequest('POST', `/v10/projects/${VERCEL_PROJECT_ID}/domains`, { name: domain })
    const data = await res.json()

    if (res.ok || res.status === 409) {
      // 409 = ya existe, igual obtenemos info
      const checkRes = await vercelRequest('GET', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`)
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        vercelStatus = checkData.verified ? 'verified' : 'pending'
        verification = checkData.verification || []
      }
    } else {
      vercelStatus = 'error'
    }
  }

  return NextResponse.json({ domain, status: vercelStatus, cname, verification })
}

// DELETE /api/tenant/domain — elimina dominio personalizado
export async function DELETE(request: NextRequest) {
  const { tenantId } = await request.json()
  if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

  // Obtener dominio actual antes de borrar
  const { data: tenant } = await supabase()
    .from('tenants')
    .select('primary_domain')
    .eq('id', tenantId)
    .single()

  // Eliminar de Vercel si existe
  if (tenant?.primary_domain && VERCEL_TOKEN && VERCEL_PROJECT_ID) {
    await vercelRequest('DELETE', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${tenant.primary_domain}`)
  }

  // Limpiar en BD
  await supabase()
    .from('tenants')
    .update({ primary_domain: null })
    .eq('id', tenantId)

  return NextResponse.json({ ok: true })
}
