-- Nullable metadata only: existing carts and their item arrays remain intact.
set lock_timeout = '3s';
alter table public.pos_carts add column if not exists cart_context jsonb;
