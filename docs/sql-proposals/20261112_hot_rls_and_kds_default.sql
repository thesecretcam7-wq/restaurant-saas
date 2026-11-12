-- REVIEW ONLY: not applied. Production approval is required.
-- Kept outside supabase/migrations so a deploy cannot apply this implicitly.
begin;
set local lock_timeout = '3s';

-- New restaurants must opt in. Existing restaurants keep their preference.
alter table public.restaurant_settings alter column kds_enabled set default false;

-- Keep every policy's command, roles, permissions and tenant predicate intact.
-- Only turn statement-constant auth.uid() evaluation into an InitPlan.
do $migration$
declare p record; new_qual text; new_check text; command text;
begin
  for p in select * from pg_policies
    where schemaname = 'public' and tablename in (
      'tenants','restaurant_settings','orders','order_items',
      'cash_closings','cash_closing_items','cash_bill_payments'
    )
    and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%')
  loop
    -- Already optimized policies contain a SELECT around auth.uid().
    if coalesce(p.qual,'') like '%SELECT auth.uid()%' or coalesce(p.with_check,'') like '%SELECT auth.uid()%' then continue; end if;
    new_qual := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    new_check := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    command := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if new_qual is not null then command := command || ' using (' || new_qual || ')'; end if;
    if new_check is not null then command := command || ' with check (' || new_check || ')'; end if;
    execute command;
  end loop;
end;
$migration$;
commit;
