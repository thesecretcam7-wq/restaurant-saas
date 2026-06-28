import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireTenantAccess, tenantAuthErrorResponse } from '@/lib/tenant-api-auth';
import { getCurrentCashClosingPeriodWithServiceClient } from '@/lib/cash-closing-server';

function cleanText(value: unknown, fallback = '') {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function isMissingBillPaymentsTable(error: any) {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  return text.includes('cash_bill_payments') || error?.code === '42P01' || error?.code === 'PGRST205';
}

export async function GET(request: NextRequest) {
  const tenantId = request.nextUrl.searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
  }

  try {
    await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });
    const supabase = createServiceClient();
    const period = await getCurrentCashClosingPeriodWithServiceClient(supabase, tenantId);

    const { data, error } = await supabase
      .from('cash_bill_payments')
      .select('id, supplier_name, concept, invoice_number, amount, staff_name, paid_at, notes')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('cash_closing_id', null)
      .gte('paid_at', period.periodStart)
      .lt('paid_at', period.periodEnd)
      .order('paid_at', { ascending: false })
      .limit(100);

    if (error) {
      if (isMissingBillPaymentsTable(error)) {
        return NextResponse.json({ payments: [], setupRequired: true });
      }
      throw error;
    }

    return NextResponse.json({ payments: data || [], period });
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
    const amount = Number(body.amount);
    const supplierName = cleanText(body.supplierName, 'Factura pagada');
    const concept = cleanText(body.concept);
    const invoiceNumber = cleanText(body.invoiceNumber);
    const notes = cleanText(body.notes);

    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Importe invalido' }, { status: 400 });
    }

    const access = await requireTenantAccess(tenantId, { staffRoles: ['admin', 'cajero'] });
    const staffName = cleanText(body.staffName, 'Sin asignar');
    const staffId = cleanText(body.staffId, access.type === 'staff' ? access.staffId || '' : '');
    const normalizedStaffId = staffId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staffId)
      ? staffId
      : null;

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('cash_bill_payments')
      .insert({
        tenant_id: tenantId,
        staff_id: normalizedStaffId,
        staff_name: staffName,
        supplier_name: supplierName,
        concept: concept || null,
        invoice_number: invoiceNumber || null,
        amount,
        notes: notes || null,
        payment_method: 'cash',
        status: 'active',
        cash_closing_id: null,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (isMissingBillPaymentsTable(error)) {
        return NextResponse.json(
          { error: 'Falta aplicar la migracion de pagos de facturas en Supabase.' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ payment: data });
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
