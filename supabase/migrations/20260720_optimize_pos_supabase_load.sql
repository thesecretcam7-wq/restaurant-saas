-- Optimize POS cloud reads and offline sale sync pressure.
-- These indexes are intentionally non-destructive and safe to re-run.

CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_desc
  ON orders (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_payment_created
  ON orders (tenant_id, payment_status, created_at);

CREATE INDEX IF NOT EXISTS idx_orders_tenant_delivery_payment_created_desc
  ON orders (tenant_id, delivery_type, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_carts_tenant_session_active
  ON pos_carts (tenant_id, cart_session_id)
  WHERE abandoned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant_active_sort
  ON menu_categories (tenant_id, active, sort_order);

CREATE INDEX IF NOT EXISTS idx_reservations_tenant_date_status_time
  ON reservations (tenant_id, reservation_date, status, reservation_time);

CREATE INDEX IF NOT EXISTS idx_cash_closings_tenant_closed_desc
  ON cash_closings (tenant_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_cash_closing_items_tenant_order
  ON cash_closing_items (tenant_id, order_id)
  WHERE order_id IS NOT NULL;
