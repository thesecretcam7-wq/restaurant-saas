ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS show_in_store BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_category_sort
ON public.menu_items(tenant_id, category_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_menu_items_store_visibility
ON public.menu_items(tenant_id, show_in_store, available);
