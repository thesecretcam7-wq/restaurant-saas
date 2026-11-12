-- Read-only replacements for per-row PostgREST JSON/LATERAL joins.
-- Called only after server-side tenant authorization, never from public clients.
create or replace function public.get_unclosed_cash_orders(
  p_tenant_id uuid, p_start timestamptz, p_end timestamptz,
  p_paid_only boolean default false, p_limit integer default 1000, p_offset integer default 0
)
returns table (
  id uuid, order_number text, total numeric, tax numeric, delivery_fee numeric,
  delivery_type text, payment_method text, payment_breakdown jsonb,
  payment_status text, status text, created_at timestamptz, notes text
)
language sql stable security invoker set search_path = pg_catalog
as $function$
  select o.id, o.order_number::text, o.total, o.tax, o.delivery_fee,
    o.delivery_type::text, o.payment_method::text, o.payment_breakdown,
    o.payment_status::text, o.status::text, o.created_at, o.notes
  from public.orders o
  where o.tenant_id = p_tenant_id
    and o.created_at >= p_start and o.created_at < p_end
    and o.payment_method is not null
    and (not p_paid_only or o.payment_status = 'paid')
    and not exists (
      select 1 from public.cash_closing_items c
      where c.tenant_id = p_tenant_id and c.order_id = o.id
    )
  order by o.created_at, o.id
  limit least(1000, greatest(1, p_limit)) offset greatest(0, p_offset);
$function$;

create or replace function public.get_closed_cash_order_ids(
  p_tenant_id uuid, p_start timestamptz, p_end timestamptz default null,
  p_limit integer default 1000, p_offset integer default 0
)
returns table (order_id uuid)
language sql stable security invoker set search_path = pg_catalog
as $function$
  select o.id
  from public.orders o
  where o.tenant_id = p_tenant_id and o.created_at >= p_start
    and (p_end is null or o.created_at < p_end)
    and exists (
      select 1 from public.cash_closing_items c
      where c.tenant_id = p_tenant_id and c.order_id = o.id
    )
  order by o.id
  limit least(1000, greatest(1, p_limit)) offset greatest(0, p_offset);
$function$;

revoke all on function public.get_unclosed_cash_orders(uuid,timestamptz,timestamptz,boolean,integer,integer) from public, anon, authenticated;
revoke all on function public.get_closed_cash_order_ids(uuid,timestamptz,timestamptz,integer,integer) from public, anon, authenticated;
grant execute on function public.get_unclosed_cash_orders(uuid,timestamptz,timestamptz,boolean,integer,integer) to service_role;
grant execute on function public.get_closed_cash_order_ids(uuid,timestamptz,timestamptz,integer,integer) to service_role;
