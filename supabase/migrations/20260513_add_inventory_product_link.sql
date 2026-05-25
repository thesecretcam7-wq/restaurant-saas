-- Link inventory rows to menu items when the column is missing in older databases.

ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES menu_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_tenant_product_unique
ON inventory(tenant_id, product_id)
WHERE product_id IS NOT NULL;
