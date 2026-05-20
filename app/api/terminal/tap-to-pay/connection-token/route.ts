import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'
import { assertTerminalReady, getOrCreateTerminalLocation, getStripe, resolveTerminalTenant } from '@/lib/terminal-payments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const tenantId = String(body.tenantId || '').trim()

    if (!tenantId) {
      return NextResponse.json({ error: 'Restaurante requerido' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const tenant = await resolveTerminalTenant(supabase, tenantId)
    await requireTenantAccess(tenant.id, { staffRoles: ['admin', 'cajero', 'camarero'] })
    assertTerminalReady(tenant)

    const stripe = getStripe()
    const location = await getOrCreateTerminalLocation(supabase, tenant)
    const token = await stripe.terminal.connectionTokens.create(
      {},
      { stripeAccount: tenant.stripe_account_id! }
    )

    return NextResponse.json({
      secret: token.secret,
      stripeAccountId: tenant.stripe_account_id,
      locationId: location.id,
      tenantId: tenant.id,
    })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }
    if (error instanceof Error && error.message === 'TENANT_NOT_FOUND') {
      return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'STRIPE_NOT_READY') {
      return NextResponse.json({ error: 'Stripe no esta listo para este restaurante' }, { status: 400 })
    }

    console.error('[terminal connection token]', error)
    return NextResponse.json({ error: 'No se pudo crear el token de Terminal' }, { status: 500 })
  }
}
