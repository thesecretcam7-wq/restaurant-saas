CREATE TABLE IF NOT EXISTS staff_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'camarero',
  endpoint TEXT NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  p256dh TEXT,
  auth TEXT,
  user_agent TEXT,
  last_error TEXT,
  disabled_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_push_subscriptions_tenant_role
  ON staff_push_subscriptions(tenant_id, role)
  WHERE disabled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_staff_push_subscriptions_staff
  ON staff_push_subscriptions(staff_id)
  WHERE staff_id IS NOT NULL AND disabled_at IS NULL;

ALTER TABLE staff_push_subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE staff_push_subscriptions TO service_role;
