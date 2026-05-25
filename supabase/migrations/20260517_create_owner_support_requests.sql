CREATE TABLE IF NOT EXISTS owner_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  restaurant_name TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source TEXT NOT NULL DEFAULT 'support_page',
  owner_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_support_requests_status
  ON owner_support_requests(status);

CREATE INDEX IF NOT EXISTS idx_owner_support_requests_created_at
  ON owner_support_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_owner_support_requests_tenant_id
  ON owner_support_requests(tenant_id);

ALTER TABLE owner_support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage owner support requests" ON owner_support_requests;
CREATE POLICY "Service role can manage owner support requests"
  ON owner_support_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
