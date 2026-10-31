-- Applied migration version matches the production migration history.
-- Server-only aggregate. The admin page already authorizes the restaurant;
-- browser roles must not be able to request another tenant's totals.
create or replace function public.get_sales_history_totals(p_tenant_id uuid)
returns table (total_revenue numeric, sale_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(o.total), 0), count(*)
  from public.orders o
  where o.tenant_id = p_tenant_id
    and o.payment_status = 'paid'
    and lower(coalesce(o.status, '')) not in
      ('cancelled', 'canceled', 'voided', 'deleted', 'anulado', 'cancelado');
$$;

revoke all on function public.get_sales_history_totals(uuid) from public, anon, authenticated;
grant execute on function public.get_sales_history_totals(uuid) to service_role;
