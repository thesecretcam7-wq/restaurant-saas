-- Cash bill payments / cash-out records for POS shifts

CREATE TABLE IF NOT EXISTS cash_bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cash_closing_id UUID REFERENCES cash_closings(id) ON DELETE SET NULL,
  staff_id UUID,
  staff_name TEXT NOT NULL DEFAULT 'Sin asignar',
  supplier_name TEXT NOT NULL,
  concept TEXT,
  invoice_number TEXT,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_bill_payments_tenant_paid_at
  ON cash_bill_payments(tenant_id, paid_at);

CREATE INDEX IF NOT EXISTS idx_cash_bill_payments_closing
  ON cash_bill_payments(cash_closing_id);

CREATE INDEX IF NOT EXISTS idx_cash_bill_payments_open
  ON cash_bill_payments(tenant_id, paid_at)
  WHERE cash_closing_id IS NULL AND status = 'active';

ALTER TABLE cash_bill_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owner can view cash bill payments" ON cash_bill_payments
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can insert cash bill payments" ON cash_bill_payments
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can update cash bill payments" ON cash_bill_payments
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
