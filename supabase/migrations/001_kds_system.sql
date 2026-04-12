-- KDS System Improvements
-- Migration: Add enhanced order management and kitchen display system

-- 1. ORDER ITEMS TABLE - Detailed items per order
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  prepared_by TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. KDS SCREENS TABLE - Kitchen display system configuration
CREATE TABLE IF NOT EXISTS kds_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_type TEXT CHECK (display_type IN ('kitchen', 'bar', 'dessert', 'drinks', 'all')) DEFAULT 'kitchen',
  categories JSONB DEFAULT '[]', -- Array of category IDs to display
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ORDER ITEM STATUS HISTORY TABLE
CREATE TABLE IF NOT EXISTS order_item_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for KDS performance
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_tenant ON order_items(tenant_id);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_order_items_created ON order_items(created_at);
CREATE INDEX idx_kds_screens_tenant ON kds_screens(tenant_id);
CREATE INDEX idx_kds_screens_active ON kds_screens(is_active);
CREATE INDEX idx_order_item_status_history_order_item ON order_item_status_history(order_item_id);

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for order_items
CREATE POLICY "Tenant owner can view order items" ON order_items
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can update order items" ON order_items
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policies for KDS screens
CREATE POLICY "Tenant owner can view kds screens" ON kds_screens
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage kds screens" ON kds_screens
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policies for status history
CREATE POLICY "Tenant owner can view status history" ON order_item_status_history
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can insert status history" ON order_item_status_history
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
