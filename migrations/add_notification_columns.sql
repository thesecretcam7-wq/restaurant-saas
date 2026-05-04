-- Add notification tracking columns to tenants table
-- Run this migration in your Supabase SQL editor

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_expiration_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_expiration_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_payment_failure_at TIMESTAMPTZ;

-- Create index for notification job queries
CREATE INDEX IF NOT EXISTS idx_tenants_trial_expires_at ON tenants(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL AND trial_expiration_notified = false;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_expires_at ON tenants(subscription_expires_at)
  WHERE subscription_expires_at IS NOT NULL AND subscription_expiration_notified = false;

CREATE INDEX IF NOT EXISTS idx_tenants_payment_failures ON tenants(last_payment_failure_at)
  WHERE payment_failure_count > 0;
