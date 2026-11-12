-- Apply only after the authorized cart API and legacy bridge are deployed.
-- Preserve all rows and keep RLS enabled; only the server may access the table.
set local lock_timeout='3s';
alter policy "Allow cart inserts" on public.pos_carts to service_role with check (true);
alter policy "Allow cart updates" on public.pos_carts to service_role using (true) with check (true);
alter policy "Allow cart deletes" on public.pos_carts to service_role using (true);
alter policy "Public read for customer display" on public.pos_carts to service_role using (true);
