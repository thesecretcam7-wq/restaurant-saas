-- Table QR Codes for Self-Service Ordering
-- Migration: Add QR codes for table-based ordering

CREATE TABLE IF NOT EXISTS table_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  qr_code_data TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS table_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  order_items JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_table_qr_codes_tenant ON table_qr_codes(tenant_id);
CREATE INDEX idx_table_qr_codes_table ON table_qr_codes(table_id);
CREATE INDEX idx_table_qr_codes_unique ON table_qr_codes(unique_code);
CREATE INDEX idx_table_orders_tenant ON table_orders(tenant_id);
CREATE INDEX idx_table_orders_table ON table_orders(table_id);
CREATE INDEX idx_table_orders_session ON table_orders(session_id);
CREATE INDEX idx_table_orders_status ON table_orders(status);

-- Enable RLS
ALTER TABLE table_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for table_qr_codes
CREATE POLICY "Tenant owner can view qr codes" ON table_qr_codes
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage qr codes" ON table_qr_codes
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policies for table_orders
CREATE POLICY "Tenant owner can view table orders" ON table_orders
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage table orders" ON table_orders
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
