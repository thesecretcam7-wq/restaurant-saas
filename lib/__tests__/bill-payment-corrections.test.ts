import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '../../app/api/purchase-invoices/payments/route';
import { TenantAuthError } from '../tenant-api-auth';

const mocks = vi.hoisted(() => ({ client: null as any, access: vi.fn(), audit: vi.fn() }));
vi.mock('../supabase/server', () => ({ createServiceClient: () => mocks.client }));
vi.mock('../tenant-api-auth', async original => ({ ...await original<typeof import('../tenant-api-auth')>(), requireTenantAccess: mocks.access }));
vi.mock('../audit-log', () => ({ writeAuditLog: mocks.audit }));

let row: any;
let conflict = false;
let calls: Array<{ url: URL; method: string; body: any }>;
beforeEach(() => {
  vi.clearAllMocks();
  row = { id: 'bill', tenant_id: 'tenant', amount: 50, status: 'active', payment_method: 'cash', cash_closing_id: null, paid_at: '2026-11-11T12:00:00Z', updated_at: '2026-11-11T12:01:00Z', notes: 'PAN' };
  conflict = false;
  calls = [];
  mocks.access.mockResolvedValue({ type: 'staff', staffId: 'admin', role: 'admin' });
  mocks.audit.mockResolvedValue(undefined);
  mocks.client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method || 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ url, method, body });
      const found = url.searchParams.get('tenant_id') === `eq.${row.tenant_id}` && url.searchParams.get('id') === `eq.${row.id}`;
      if (method === 'GET') return Response.json(found ? [row] : []);
      if (method !== 'PATCH') throw Error('Unexpected database mutation');
      if (conflict) return Response.json({ code: 'PGRST116', details: 'The result contains 0 rows', message: 'JSON object requested, multiple (or no) rows returned' }, { status: 406 });
      if (!found) throw Error('Unscoped mutation');
      Object.assign(row, body);
      return Response.json({ id: row.id, amount: row.amount, status: row.status });
    } },
  });
});
const correct = (amount: unknown, tenantId = 'tenant') => PATCH(new NextRequest('https://app.test/api/purchase-invoices/payments', {
  method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId, id: 'bill', amount }),
}));
const cancel = () => DELETE(new NextRequest('https://app.test/api/purchase-invoices/payments?tenantId=tenant&id=bill', { method: 'DELETE' }));
const writes = () => calls.filter(call => call.method === 'PATCH');

describe('admin bill payment corrections', () => {
  it('corrects a cash amount in place, preserves date/source, and records the previous amount', async () => {
    expect((await correct('20,25')).status).toBe(200);
    expect(row).toMatchObject({ amount: 20.25, payment_method: 'cash', paid_at: '2026-11-11T12:00:00Z', status: 'active' });
    expect(row.notes).toContain('50.00 → 20.25');
    expect(writes()).toHaveLength(1);
    expect(writes()[0].url.searchParams.get('cash_closing_id')).toBe('is.null');
    expect(writes()[0].url.searchParams.get('updated_at')).toBe('eq.2026-11-11T12:01:00Z');
    expect(mocks.access).toHaveBeenCalledWith('tenant', { staffRoles: ['admin'], requireAdminPermission: true });
    expect(mocks.audit).toHaveBeenCalledWith(mocks.client, expect.objectContaining({ action: 'bill_payment.corrected', metadata: expect.objectContaining({ previous_amount: 50, amount: 20.25 }) }));
  });
  it('annuls an open cash payment without deleting its original amount or record', async () => {
    expect((await cancel()).status).toBe(200);
    expect(row).toMatchObject({ status: 'voided', amount: 50 });
    expect(row.notes).toContain('Pago anulado');
    expect(writes()[0].url.searchParams.get('status')).toBe('eq.active');
  });
  it('keeps correction and cancellation available for external payments', async () => {
    row.payment_method = 'external';
    expect((await correct(25)).status).toBe(200);
    expect((await cancel()).status).toBe(200);
    expect(row).toMatchObject({ status: 'voided', amount: 25, payment_method: 'external' });
  });
  it('protects cash payments already included in a closing', async () => {
    row.cash_closing_id = 'closed';
    expect((await correct(25)).status).toBe(409);
    expect((await cancel()).status).toBe(409);
    expect(writes()).toHaveLength(0);
  });
  it('returns a conflict if another edit or closing won the race', async () => {
    conflict = true;
    expect((await correct(25)).status).toBe(409);
    expect(row.amount).toBe(50);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it('rejects other tenants and non-admin access without changing any record', async () => {
    expect((await correct(25, 'another')).status).toBe(404);
    mocks.access.mockRejectedValue(new TenantAuthError('Forbidden', 403));
    expect((await correct(25)).status).toBe(403);
    expect(writes()).toHaveLength(0);
  });
  it.each([0, -1, 'invalid', 0.001, 1e308])('rejects invalid correction %s', async value => {
    expect((await correct(value)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
  it('does not change or audit an identical amount or repeat an annulment', async () => {
    expect((await correct(50)).status).toBe(200);
    row.status = 'voided';
    expect((await cancel()).status).toBe(200);
    expect((await correct(20)).status).toBe(409);
    expect(writes()).toHaveLength(0);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
