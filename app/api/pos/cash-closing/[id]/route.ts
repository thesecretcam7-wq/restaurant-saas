import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/audit-log'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId : ''
    const actualCashCount = Number(body.actualCashCount)
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

    if (!id) {
      return NextResponse.json({ error: 'ID de cierre requerido' }, { status: 400 })
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requerido' }, { status: 400 })
    }

    if (!Number.isFinite(actualCashCount) || actualCashCount < 0) {
      return NextResponse.json({ error: 'Monto contado invalido' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'Escribe el motivo de la correccion' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: existing, error: existingError } = await supabase
      .from('cash_closings')
      .select('id, tenant_id, expected_total, actual_cash_count, difference, notes, closed_at, staff_name')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 })
    }

    if (existing.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'El cierre no pertenece a este restaurante' }, { status: 403 })
    }

    const access = await requireTenantAccess(existing.tenant_id, {
      staffRoles: ['admin'],
      requireAdminPermission: true,
    })

    const expectedTotal = Number(existing.expected_total) || 0
    const previousActualCash = Number(existing.actual_cash_count) || 0
    const previousDifference = Number(existing.difference) || 0
    const difference = expectedTotal - actualCashCount
    const correctedAt = new Date().toISOString()
    const correctionNote = [
      `Correccion ${correctedAt}`,
      `Monto contado anterior: ${previousActualCash}`,
      `Monto contado corregido: ${actualCashCount}`,
      `Motivo: ${reason}`,
    ].join(' | ')

    const { data: closing, error: updateError } = await supabase
      .from('cash_closings')
      .update({
        actual_cash_count: actualCashCount,
        difference,
        is_balanced: Math.abs(difference) < 0.01,
        notes: existing.notes ? `${existing.notes}\n${correctionNote}` : correctionNote,
        updated_at: correctedAt,
      })
      .eq('id', id)
      .eq('tenant_id', existing.tenant_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await writeAuditLog(supabase, {
      tenantId: existing.tenant_id,
      actor: access,
      action: 'cash_closing.corrected',
      entityType: 'cash_closing',
      entityId: id,
      reason,
      metadata: {
        closed_at: existing.closed_at,
        staff_name: existing.staff_name,
        expected_total: expectedTotal,
        previous_actual_cash_count: previousActualCash,
        new_actual_cash_count: actualCashCount,
        previous_difference: previousDifference,
        new_difference: difference,
      },
    })

    return NextResponse.json({ closing })
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    )
  }
}
