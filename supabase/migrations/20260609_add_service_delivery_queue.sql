-- Split kitchen-prep items from direct service items such as drinks.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS requires_kitchen BOOLEAN;

UPDATE order_items
SET requires_kitchen = true
WHERE requires_kitchen IS NULL;

ALTER TABLE order_items
  ALTER COLUMN requires_kitchen SET DEFAULT true,
  ALTER COLUMN requires_kitchen SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_tenant_requires_status
  ON order_items(tenant_id, requires_kitchen, status);
