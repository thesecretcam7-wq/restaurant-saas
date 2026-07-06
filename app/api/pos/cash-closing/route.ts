import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import {
  calculateCashClosingStatsByMode,
  saveCashClosingWithServiceClient,
  type CashClosingMode,
} from '@/lib/cash-closing-server';

export const maxDuration = 30;

const CASH_CLOSING_OPERATION_TIMEOUT_MS = 20_000;

function normalizeMode(value: string | null): CashClosingMode {
  return value === 'pending' ? 'pending' : 'current';
}

function cleanText(value: unknown, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

async function withCashClosingTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`${label} tardó demasiado. Intenta de nuevo en unos segundos.`)),
      CASH_CLOSING_OPERATION_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');
  const mode = normalizeMode(request.nextUrl.searchParams.get('mode'));

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await withCashClosingTimeout(
      requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] }),
      'La validación de acceso'
    );

    const supabase = createServiceClient();
    const stats = await withCashClosingTimeout(
      calculateCashClosingStatsByMode(supabase, tenantId, mode),
      'El cálculo del cierre de caja'
    );

    return NextResponse.json({ stats, mode });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = cleanText(body.tenantId);
    const mode = normalizeMode(typeof body.mode === 'string' ? body.mode : null);

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }

    const actualCashCount = Number(body.actualCashCount);
    if (!Number.isFinite(actualCashCount) || actualCashCount < 0) {
      return NextResponse.json({ error: 'Monto contado invalido' }, { status: 400 });
    }

    const access = await withCashClosingTimeout(
      requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] }),
      'La validación de acceso'
    );
    const supabase = createServiceClient();
    const stats = await withCashClosingTimeout(
      calculateCashClosingStatsByMode(supabase, tenantId, mode),
      'El cálculo del cierre de caja'
    );

    if (!stats) {
      return NextResponse.json({ error: 'No hay ventas pendientes para cerrar' }, { status: 409 });
    }

    const closing = await withCashClosingTimeout(
      saveCashClosingWithServiceClient(
        supabase,
        tenantId,
        cleanText(body.staffId, access.type === 'staff' ? access.staffId || '' : '') || null,
        cleanText(body.staffName, 'Sin asignar'),
        {
          ...stats,
          actualCashCount,
          notes: cleanText(body.notes),
        }
      ),
      'El guardado del cierre de caja'
    );

    return NextResponse.json({ closing, stats, mode });
  } catch (error) {
    if (error instanceof Error && ['Unauthorized', 'Forbidden'].includes(error.message)) {
      return tenantAuthErrorResponse(error);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
