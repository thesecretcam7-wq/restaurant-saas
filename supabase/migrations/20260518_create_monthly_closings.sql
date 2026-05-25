-- Monthly Closing System
-- Stores month-end sales snapshots so restaurants can print and keep monthly closing tickets.

CREATE TABLE IF NOT EXISTS monthly_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  staff_name TEXT NOT NULL DEFAULT 'Administrador',

  cash_sales NUMERIC(10,2) DEFAULT 0,
  card_sales NUMERIC(10,2) DEFAULT 0,
  other_sales NUMERIC(10,2) DEFAULT 0,
  total_sales NUMERIC(10,2) DEFAULT 0,
  total_delivery_fees NUMERIC(10,2) DEFAULT 0,
  delivery_order_count INT DEFAULT 0,
  total_tax NUMERIC(10,2) DEFAULT 0,
  total_discount NUMERIC(10,2) DEFAULT 0,

  transaction_count INT DEFAULT 0,
  orders_completed INT DEFAULT 0,
  orders_cancelled INT DEFAULT 0,

  notes TEXT,
  closed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT monthly_closings_unique_period UNIQUE (tenant_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_closings_tenant_period
  ON monthly_closings(tenant_id, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_closings_closed_at
  ON monthly_closings(closed_at DESC);

ALTER TABLE monthly_closings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON monthly_closings TO authenticated;
GRANT ALL ON monthly_closings TO service_role;

DROP POLICY IF EXISTS "Tenant owner can view monthly closings" ON monthly_closings;
CREATE POLICY "Tenant owner can view monthly closings" ON monthly_closings
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenant owner can insert monthly closings" ON monthly_closings;
CREATE POLICY "Tenant owner can insert monthly closings" ON monthly_closings
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenant owner can update monthly closings" ON monthly_closings;
CREATE POLICY "Tenant owner can update monthly closings" ON monthly_closings
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
