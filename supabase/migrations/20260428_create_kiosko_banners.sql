-- Create kiosko_banners table
CREATE TABLE IF NOT EXISTS kiosko_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kiosko_banners_tenant ON kiosko_banners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kiosko_banners_active ON kiosko_banners(active);

-- Enable RLS
ALTER TABLE kiosko_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Kiosko banners are public" ON kiosko_banners
  FOR SELECT USING (active = true);

CREATE POLICY "Tenant owner can manage banners" ON kiosko_banners
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM tenants WHERE id = kiosko_banners.tenant_id
    )
  );
