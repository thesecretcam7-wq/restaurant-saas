-- Promotions and Discounts System
-- Migration: Add promotional codes and discount management

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('percentage', 'fixed', 'buy_one_get_one')),
  value NUMERIC(10,2) NOT NULL,
  max_discount NUMERIC(10,2),
  min_order_value NUMERIC(10,2),
  applicable_to TEXT CHECK (applicable_to IN ('all', 'specific_products', 'specific_categories')),
  applicable_items JSONB DEFAULT '[]',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_uses INT,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  max_uses INT,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  points_per_dollar NUMERIC(5,2) DEFAULT 1,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, customer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  loyalty_id UUID NOT NULL REFERENCES loyalty_points(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points_used INT NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_promotions_tenant ON promotions(tenant_id);
CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_dates ON promotions(valid_from, valid_until);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_tenant ON discount_codes(tenant_id);
CREATE INDEX idx_loyalty_points_customer ON loyalty_points(customer_id);
CREATE INDEX idx_loyalty_points_tenant ON loyalty_points(tenant_id);
CREATE INDEX idx_loyalty_redemptions_loyalty ON loyalty_redemptions(loyalty_id);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant owner can view promotions" ON promotions
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage promotions" ON promotions
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can view discount codes" ON discount_codes
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage discount codes" ON discount_codes
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can view loyalty" ON loyalty_points
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage loyalty" ON loyalty_points
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can view loyalty redemptions" ON loyalty_redemptions
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
