-- Complete Subscription Management Setup
-- Run this entire script in Supabase SQL Editor

-- ====== 1. CREATE AUDIT LOGS TABLE ======
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_id ON audit_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_owner_access" ON audit_logs
  FOR SELECT
  USING (
    owner_id = auth.uid() OR
    tenant_id IN (
      SELECT id FROM tenants WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- ====== 2. ADD NOTIFICATION COLUMNS TO TENANTS ======
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_expiration_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_expiration_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_failure_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenants_trial_expires_at ON tenants(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL AND trial_expiration_notified = false;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_expires_at ON tenants(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL AND subscription_expiration_notified = false;

CREATE INDEX IF NOT EXISTS idx_tenants_payment_failures ON tenants(last_payment_failure_at)
  WHERE payment_failure_count > 0;

-- ====== 3. VERIFY TABLES ======
SELECT 'Audit logs table created' as status;
SELECT 'Notification columns added' as status;
