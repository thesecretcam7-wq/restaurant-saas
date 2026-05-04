-- Enable KDS Realtime
-- Migration: Enable realtime subscriptions and add missing INSERT policies

-- 1. Add INSERT policy for order_items
CREATE POLICY "Tenant owner can insert order items" ON order_items
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- 2. Add INSERT policy for order_item_status_history (if not exists)
-- Note: This allows inserting status history records
-- Already defined in 001_kds_system.sql, but making sure

-- 3. Enable REPLICA IDENTITY for realtime
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_item_status_history REPLICA IDENTITY FULL;

-- 4. Verify indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_status ON order_items(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
