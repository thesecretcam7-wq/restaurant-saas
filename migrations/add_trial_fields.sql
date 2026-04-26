-- Add trial period tracking fields to tenants table
-- Run this migration in your Supabase SQL editor

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

-- Update existing tenants to have trial dates (for tenants created before this migration)
UPDATE tenants
SET
  trial_started_at = created_at,
  trial_ends_at = created_at + interval '30 days'
WHERE trial_started_at IS NULL;
