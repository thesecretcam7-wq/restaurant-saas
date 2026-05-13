ALTER TABLE restaurant_settings
  ADD COLUMN IF NOT EXISTS online_payment_provider TEXT DEFAULT 'stripe'
    CHECK (online_payment_provider IN ('stripe', 'wompi', 'none')),
  ADD COLUMN IF NOT EXISTS wompi_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wompi_environment TEXT DEFAULT 'sandbox'
    CHECK (wompi_environment IN ('sandbox', 'production')),
  ADD COLUMN IF NOT EXISTS wompi_public_key TEXT,
  ADD COLUMN IF NOT EXISTS wompi_private_key TEXT,
  ADD COLUMN IF NOT EXISTS wompi_integrity_key TEXT,
  ADD COLUMN IF NOT EXISTS wompi_updated_at TIMESTAMPTZ;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS wompi_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS wompi_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_wompi_transaction_id ON orders(wompi_transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_wompi_reference ON orders(wompi_reference);
