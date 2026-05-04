-- Add index on order_number for faster searches in POS "Find & Pay" feature
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Add index on (tenant_id, order_number) for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_orders_tenant_order_number ON orders(tenant_id, order_number);

-- Add index on (tenant_id, payment_status) for payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_tenant_payment_status ON orders(tenant_id, payment_status);
