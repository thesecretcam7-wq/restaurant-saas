-- Additive metadata only. Existing quantities and historical records are unchanged.
alter table public.inventory add column if not exists unit text;

create or replace function public.record_inventory_movement(
  p_tenant_id uuid, p_inventory_id uuid, p_type text, p_quantity numeric,
  p_request_id uuid, p_expected_stock numeric default null,
  p_notes text default null, p_created_by text default null
) returns jsonb language plpgsql security invoker set search_path = pg_catalog as $$
declare
  item public.inventory%rowtype;
  prior public.stock_movements%rowtype;
  movement public.stock_movements%rowtype;
  next_stock numeric;
  delta numeric;
  ref text := 'inventory-manual:' || p_request_id::text;
begin
  if p_request_id is null or p_type not in ('purchase','sale','damage','return','adjustment')
    or p_type is null or p_quantity is null or p_quantity::text in ('NaN','Infinity','-Infinity')
    or p_quantity < 0 or p_quantity > 999999999.999 or round(p_quantity,3) <> p_quantity
    or (p_quantity = 0 and p_type <> 'adjustment') then
    raise exception 'INVALID_QUANTITY' using errcode='22023';
  end if;
  select * into item from public.inventory where tenant_id=p_tenant_id and id=p_inventory_id for update;
  if not found then raise exception 'INVENTORY_NOT_FOUND' using errcode='P0002'; end if;
  select * into prior from public.stock_movements
    where tenant_id=p_tenant_id and inventory_id=p_inventory_id and reference_id=ref limit 1;
  if found then
    if prior.movement_type <> p_type or
      (p_type <> 'adjustment' and prior.quantity <> p_quantity) or
      (p_type='adjustment' and (p_expected_stock is null or prior.quantity <> p_quantity-p_expected_stock)) then
      raise exception 'REQUEST_REUSED' using errcode='22023';
    end if;
    return jsonb_build_object('updated',to_jsonb(item),'movement',to_jsonb(prior),'replayed',true);
  end if;
  if p_type='adjustment' and (p_expected_stock is null or coalesce(item.current_stock,0) is distinct from p_expected_stock) then
    raise exception 'STOCK_CHANGED' using errcode='P0001';
  end if;
  next_stock := case when p_type='adjustment' then p_quantity
    when p_type in ('sale','damage') then coalesce(item.current_stock,0)-p_quantity
    else coalesce(item.current_stock,0)+p_quantity end;
  if next_stock < 0 then raise exception 'INSUFFICIENT_STOCK' using errcode='22023'; end if;
  if next_stock > 999999999.999 then raise exception 'INVALID_QUANTITY' using errcode='22023'; end if;
  delta := next_stock-coalesce(item.current_stock,0);
  if delta=0 then return jsonb_build_object('updated',to_jsonb(item),'movement',null,'unchanged',true); end if;
  update public.inventory set current_stock=next_stock,updated_at=now()
    where tenant_id=p_tenant_id and id=p_inventory_id returning * into item;
  insert into public.stock_movements(tenant_id,inventory_id,movement_type,quantity,notes,reference_id,created_by)
    values(p_tenant_id,p_inventory_id,p_type,case when p_type='adjustment' then delta else p_quantity end,
      left(coalesce(p_notes,''),500),ref,left(coalesce(p_created_by,''),160)) returning * into movement;
  update public.stock_alerts set is_resolved=true
    where tenant_id=p_tenant_id and inventory_id=p_inventory_id and is_resolved=false;
  if next_stock <= coalesce(item.min_stock,0) then
    insert into public.stock_alerts(tenant_id,inventory_id,alert_type)
      values(p_tenant_id,p_inventory_id,case when next_stock=0 then 'out_of_stock' else 'low_stock' end);
  end if;
  return jsonb_build_object('updated',to_jsonb(item),'movement',to_jsonb(movement),'replayed',false);
end;
$$;
revoke all on function public.record_inventory_movement(uuid,uuid,text,numeric,uuid,numeric,text,text) from public,anon,authenticated;
grant execute on function public.record_inventory_movement(uuid,uuid,text,numeric,uuid,numeric,text,text) to service_role;

create or replace function public.create_inventory_item(
  p_tenant_id uuid, p_item_id uuid, p_values jsonb, p_created_by text
) returns jsonb language plpgsql security invoker set search_path=pg_catalog as $$
declare item public.inventory%rowtype;
begin
  -- Serializes a retried creation without locking any historical inventory row.
  perform pg_advisory_xact_lock(hashtextextended('inventory-create:'||p_item_id::text,0));
  select * into item from public.inventory where id=p_item_id;
  if found then
    if item.tenant_id <> p_tenant_id then raise exception 'REQUEST_REUSED' using errcode='22023'; end if;
    return to_jsonb(item);
  end if;
  if p_tenant_id is null or p_item_id is null or coalesce(trim(p_values->>'product_name'),'')='' then
    raise exception 'INVALID_ITEM' using errcode='22023';
  end if;
  if (p_values->>'sku') is not null and exists(select 1 from public.inventory
    where tenant_id=p_tenant_id and sku=p_values->>'sku') then
    raise exception 'SKU_EXISTS' using errcode='23505';
  end if;
  insert into public.inventory(id,tenant_id,product_name,sku,unit,current_stock,min_stock,max_stock,cost_per_unit,supplier)
    values(p_item_id,p_tenant_id,p_values->>'product_name',p_values->>'sku',p_values->>'unit',
      (p_values->>'current_stock')::numeric,(p_values->>'min_stock')::numeric,(p_values->>'max_stock')::numeric,
      (p_values->>'cost_per_unit')::numeric,p_values->>'supplier') returning * into item;
  if item.current_stock>0 then
    insert into public.stock_movements(tenant_id,inventory_id,movement_type,quantity,notes,reference_id,created_by)
      values(p_tenant_id,item.id,'adjustment',item.current_stock,'Cantidad inicial',
        'inventory-create:'||item.id::text,p_created_by);
  end if;
  return to_jsonb(item);
end;
$$;
revoke all on function public.create_inventory_item(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_inventory_item(uuid,uuid,jsonb,text) to service_role;
