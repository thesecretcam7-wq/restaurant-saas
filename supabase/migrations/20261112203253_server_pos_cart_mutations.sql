set local lock_timeout='3s';
-- Internal cart-only operation. No orders, payments or closings are touched.
create or replace function public.mutate_pos_cart(
  p_tenant_id uuid,p_session_id text,p_mode text,p_cart_id uuid default null,p_payload jsonb default '{}'
) returns table(id uuid) language plpgsql security invoker set search_path=pg_catalog as $cart$
declare current_id uuid; values_row public.pos_carts;
begin
  if p_tenant_id is null or p_session_id is null or p_mode is null or length(p_session_id)<8 or length(p_session_id)>160 or p_mode not in ('create','update','clear') then
    raise exception 'Invalid cart operation' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_tenant_id::text||':'||p_session_id,0));
  if p_mode='clear' then
    return query update public.pos_carts c set abandoned_at=clock_timestamp()
      where c.tenant_id=p_tenant_id and c.cart_session_id=p_session_id and c.abandoned_at is null returning c.id;
    return;
  end if;
  select c.id into current_id from public.pos_carts c
    where c.tenant_id=p_tenant_id and c.cart_session_id=p_session_id and c.abandoned_at is null
    order by c.updated_at desc,c.id desc limit 1 for update;
  if p_mode='update' and (current_id is null or current_id is distinct from p_cart_id) then return; end if;
  values_row:=jsonb_populate_record(null::public.pos_carts,p_payload);
  if current_id is null then
    return query insert into public.pos_carts(tenant_id,cart_session_id,items,discount,discount_code,subtotal,total,payment_method,pos_mode,selected_staff_id,selected_staff_name,selected_table_id,selected_table_number,cart_context)
      values(p_tenant_id,p_session_id,values_row.items,values_row.discount,values_row.discount_code,values_row.subtotal,values_row.total,values_row.payment_method,values_row.pos_mode,values_row.selected_staff_id,values_row.selected_staff_name,values_row.selected_table_id,values_row.selected_table_number,values_row.cart_context) returning pos_carts.id;
  else
    return query update public.pos_carts c set items=values_row.items,discount=values_row.discount,discount_code=values_row.discount_code,subtotal=values_row.subtotal,total=values_row.total,payment_method=values_row.payment_method,pos_mode=values_row.pos_mode,selected_staff_id=values_row.selected_staff_id,selected_staff_name=values_row.selected_staff_name,selected_table_id=values_row.selected_table_id,selected_table_number=values_row.selected_table_number,cart_context=values_row.cart_context
      where c.id=current_id and c.tenant_id=p_tenant_id and c.cart_session_id=p_session_id and c.abandoned_at is null returning c.id;
  end if;
end;
$cart$;
revoke all on function public.mutate_pos_cart(uuid,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.mutate_pos_cart(uuid,text,text,uuid,jsonb) to service_role;
