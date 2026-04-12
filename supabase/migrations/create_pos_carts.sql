-- Create POS Carts table for cart persistence
CREATE TABLE IF NOT EXISTS pos_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_session_id VARCHAR(255) NOT NULL, -- Device/session identifier
  items JSONB NOT NULL DEFAULT '[]',
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_code VARCHAR(255),
  subtotal DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  pos_mode VARCHAR(50) DEFAULT 'simple', -- simple or table
  selected_staff_id UUID,
  selected_staff_name VARCHAR(255),
  selected_table_id UUID,
  selected_table_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  abandoned_at TIMESTAMP WITH TIME ZONE -- When cart was abandoned
);

-- Indexes for performance
CREATE INDEX idx_pos_carts_tenant_id ON pos_carts(tenant_id);
CREATE INDEX idx_pos_carts_session_id ON pos_carts(cart_session_id);
CREATE INDEX idx_pos_carts_updated_at ON pos_carts(updated_at DESC);

-- Enable RLS
ALTER TABLE pos_carts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see carts from their tenant
CREATE POLICY "Users can access their tenant's carts"
  ON pos_carts
  FOR ALL
  USING (
    tenant_id = (
      SELECT id FROM tenants 
      WHERE id = auth.uid()::text::uuid
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pos_carts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pos_carts_updated_at
BEFORE UPDATE ON pos_carts
FOR EACH ROW
EXECUTE FUNCTION update_pos_carts_updated_at();
