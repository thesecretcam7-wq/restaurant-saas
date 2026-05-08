alter table public.inventory
  alter column current_stock type numeric(12,3) using current_stock::numeric,
  alter column min_stock type numeric(12,3) using min_stock::numeric,
  alter column max_stock type numeric(12,3) using max_stock::numeric;

alter table public.stock_movements
  alter column quantity type numeric(12,3) using quantity::numeric;

create table if not exists public.product_recipes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  inventory_id uuid not null references public.inventory(id) on delete cascade,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id, menu_item_id, inventory_id)
);

create index if not exists idx_product_recipes_tenant on public.product_recipes(tenant_id);
create index if not exists idx_product_recipes_menu_item on public.product_recipes(menu_item_id);
create index if not exists idx_product_recipes_inventory on public.product_recipes(inventory_id);

alter table public.product_recipes enable row level security;

drop policy if exists "Tenant owner can view product recipes" on public.product_recipes;
create policy "Tenant owner can view product recipes" on public.product_recipes
  for select using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );

drop policy if exists "Tenant owner can manage product recipes" on public.product_recipes;
create policy "Tenant owner can manage product recipes" on public.product_recipes
  for all using (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  )
  with check (
    tenant_id in (select id from public.tenants where owner_id = auth.uid())
  );
