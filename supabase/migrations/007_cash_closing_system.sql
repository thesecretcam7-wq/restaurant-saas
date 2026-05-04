-- Cash Closing System
-- Migration: Add cash closing management for daily settlements

-- 1. CASH CLOSINGS TABLE - Daily cash register settlements
CREATE TABLE IF NOT EXISTS cash_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,

  -- Timing
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ DEFAULT now(),

  -- Expected vs Actual
  opening_amount NUMERIC(10,2) DEFAULT 0,
  expected_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cash_count NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference NUMERIC(10,2) DEFAULT 0,

  -- Breakdown by payment method
  cash_sales NUMERIC(10,2) DEFAULT 0,
  card_sales NUMERIC(10,2) DEFAULT 0,
  other_sales NUMERIC(10,2) DEFAULT 0,
  total_sales NUMERIC(10,2) DEFAULT 0,

  -- Transactions
  transaction_count INT DEFAULT 0,
  orders_completed INT DEFAULT 0,
  orders_cancelled INT DEFAULT 0,

  -- Tax & Discounts
  total_tax NUMERIC(10,2) DEFAULT 0,
  total_discount NUMERIC(10,2) DEFAULT 0,

  -- Status & Notes
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  is_balanced BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CASH CLOSING ITEMS TABLE - Individual order breakdown
CREATE TABLE IF NOT EXISTS cash_closing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_closing_id UUID NOT NULL REFERENCES cash_closings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_cash_closings_tenant ON cash_closings(tenant_id);
CREATE INDEX idx_cash_closings_closed_at ON cash_closings(closed_at);
CREATE INDEX idx_cash_closings_staff_id ON cash_closings(staff_id);
CREATE INDEX idx_cash_closing_items_closing ON cash_closing_items(cash_closing_id);
CREATE INDEX idx_cash_closing_items_tenant ON cash_closing_items(tenant_id);

-- Enable RLS
ALTER TABLE cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closing_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_closings
CREATE POLICY "Tenant owner can view cash closings" ON cash_closings
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can insert cash closings" ON cash_closings
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can update cash closings" ON cash_closings
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policies for cash_closing_items
CREATE POLICY "Tenant owner can view closing items" ON cash_closing_items
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can insert closing items" ON cash_closing_items
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
