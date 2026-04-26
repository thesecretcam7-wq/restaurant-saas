-- Add subscription_expires_at to track when recurring subscription expires
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_expires_at ON tenants(subscription_expires_at);

-- Add comment
COMMENT ON COLUMN tenants.subscription_expires_at IS 'Date when the current subscription expires. If null and trial expired, account is blocked.';
