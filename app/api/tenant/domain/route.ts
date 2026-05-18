import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkFeature } from '@/lib/checkPlan'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

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

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const { data: tenant } = await supabase()
      .from('tenants')
      .select('primary_domain')
      .eq('id', tenantId)
      .single()

    if (!tenant?.primary_domain) {
      return NextResponse.json({ domain: null, status: 'none' })
    }

    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json({ domain: tenant.primary_domain, status: 'unknown' })
    }

    const res = await vercelRequest('GET', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${tenant.primary_domain}`)
    if (!res.ok) {
      return NextResponse.json({ domain: tenant.primary_domain, status: 'not_added' })
    }

    const data = await res.json()
    const verified = data.verified === true
    const cname = data.apexName ? 'cname.vercel-dns.com' : null

    return NextResponse.json({
      domain: tenant.primary_domain,
      status: verified ? 'verified' : 'pending',
      cname,
      verification: data.verification || [],
    })
  } catch (error) {
    return tenantAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, domain } = await request.json()
    if (!tenantId || !domain) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const featureCheck = await checkFeature(tenantId, 'custom_domain')
    if (!featureCheck.allowed) {
      return NextResponse.json({ error: featureCheck.reason, upgradeRequired: true }, { status: 403 })
    }

    const normalizedDomain = String(domain).trim().toLowerCase()
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(normalizedDomain)) {
      return NextResponse.json({ error: 'Formato de dominio invalido' }, { status: 400 })
    }

    const { data: existing } = await supabase()
      .from('tenants')
      .select('id')
      .eq('primary_domain', normalizedDomain)
      .neq('id', tenantId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Este dominio ya esta siendo usado por otro restaurante' }, { status: 409 })
    }

    const { error: dbError } = await supabase()
      .from('tenants')
      .update({ primary_domain: normalizedDomain })
      .eq('id', tenantId)

    if (dbError) return NextResponse.json({ error: 'Error al guardar' }, { status: 500 })

    let vercelStatus = 'saved'
    let verification: any[] = []
    const cname = 'cname.vercel-dns.com'

    if (VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      const res = await vercelRequest('POST', `/v10/projects/${VERCEL_PROJECT_ID}/domains`, { name: normalizedDomain })
      await res.json().catch(() => ({}))

      if (res.ok || res.status === 409) {
        const checkRes = await vercelRequest('GET', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${normalizedDomain}`)
        if (checkRes.ok) {
          const checkData = await checkRes.json()
          vercelStatus = checkData.verified ? 'verified' : 'pending'
          verification = checkData.verification || []
        }
      } else {
        vercelStatus = 'error'
      }
    }

    return NextResponse.json({ domain: normalizedDomain, status: vercelStatus, cname, verification })
  } catch (error) {
    return tenantAuthErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await request.json()
    if (!tenantId) return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })

    await requireTenantAccess(tenantId, { staffRoles: ['admin'], requireAdminPermission: true })

    const { data: tenant } = await supabase()
      .from('tenants')
      .select('primary_domain')
      .eq('id', tenantId)
      .single()

    if (tenant?.primary_domain && VERCEL_TOKEN && VERCEL_PROJECT_ID) {
      await vercelRequest('DELETE', `/v9/projects/${VERCEL_PROJECT_ID}/domains/${tenant.primary_domain}`)
    }

    await supabase()
      .from('tenants')
      .update({ primary_domain: null })
      .eq('id', tenantId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return tenantAuthErrorResponse(error)
  }
}
