-- Parameterized EXECUTE uses a custom plan for the actual tenant/date bounds.
-- Keep SECURITY INVOKER, the fixed search_path, qualified relations and grants.
create or replace function public.get_unclosed_cash_orders(p_tenant_id uuid,p_start timestamptz,p_end timestamptz,p_paid_only boolean default false,p_limit integer default 1000,p_offset integer default 0)
returns table(id uuid,order_number text,total numeric,tax numeric,delivery_fee numeric,delivery_type text,payment_method text,payment_breakdown jsonb,payment_status text,status text,created_at timestamptz,notes text)
language plpgsql stable security invoker set search_path=pg_catalog as $f$
begin return query execute $q$
select o.id,o.order_number::text,o.total,o.tax,o.delivery_fee,o.delivery_type::text,o.payment_method::text,o.payment_breakdown,o.payment_status::text,o.status::text,o.created_at,o.notes
from public.orders o where o.tenant_id=$1 and o.created_at>=$2 and o.created_at<$3 and o.payment_method is not null and(not $4 or o.payment_status='paid')
and not exists(select 1 from public.cash_closing_items c where c.tenant_id=$1 and c.order_id=o.id)
order by o.created_at,o.id limit $5 offset $6$q$
using p_tenant_id,p_start,p_end,p_paid_only,least(1000,greatest(1,p_limit)),greatest(0,p_offset);
end;$f$;
create or replace function public.get_closed_cash_order_ids(p_tenant_id uuid,p_start timestamptz,p_end timestamptz default null,p_limit integer default 1000,p_offset integer default 0)
returns table(order_id uuid) language plpgsql stable security invoker set search_path=pg_catalog as $f$
begin return query execute $q$
select o.id from public.orders o where o.tenant_id=$1 and o.created_at>=$2 and($3::timestamptz is null or o.created_at<$3)
and exists(select 1 from public.cash_closing_items c where c.tenant_id=$1 and c.order_id=o.id)
order by o.id limit $4 offset $5$q$
using p_tenant_id,p_start,p_end,least(1000,greatest(1,p_limit)),greatest(0,p_offset);
end;$f$;
