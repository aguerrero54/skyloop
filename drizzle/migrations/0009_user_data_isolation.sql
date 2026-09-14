-- Aislamiento por cuenta: cada fila de negocio pertenece a la cuenta que la crea.
-- Datos existentes -> cuenta de Arli Guerrero (anlet231@gmail.com).

alter table public.clients add column if not exists user_id uuid;
update public.clients set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.clients alter column user_id set default auth.uid();
alter table public.clients alter column user_id set not null;
create index if not exists clients_user_id_idx on public.clients (user_id);
drop policy if exists "clients_all" on public.clients;
create policy "clients_own" on public.clients for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.services add column if not exists user_id uuid;
update public.services set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.services alter column user_id set default auth.uid();
alter table public.services alter column user_id set not null;
create index if not exists services_user_id_idx on public.services (user_id);
drop policy if exists "services_all" on public.services;
create policy "services_own" on public.services for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.providers add column if not exists user_id uuid;
update public.providers set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.providers alter column user_id set default auth.uid();
alter table public.providers alter column user_id set not null;
create index if not exists providers_user_id_idx on public.providers (user_id);
drop policy if exists "providers_all" on public.providers;
create policy "providers_own" on public.providers for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.client_services add column if not exists user_id uuid;
update public.client_services set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.client_services alter column user_id set default auth.uid();
alter table public.client_services alter column user_id set not null;
create index if not exists client_services_user_id_idx on public.client_services (user_id);
drop policy if exists "client_services_all" on public.client_services;
create policy "client_services_own" on public.client_services for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.incomes add column if not exists user_id uuid;
update public.incomes set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.incomes alter column user_id set default auth.uid();
alter table public.incomes alter column user_id set not null;
create index if not exists incomes_user_id_idx on public.incomes (user_id);
drop policy if exists "incomes_all" on public.incomes;
create policy "incomes_own" on public.incomes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.expenses add column if not exists user_id uuid;
update public.expenses set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.expenses alter column user_id set default auth.uid();
alter table public.expenses alter column user_id set not null;
create index if not exists expenses_user_id_idx on public.expenses (user_id);
drop policy if exists "expenses_all" on public.expenses;
create policy "expenses_own" on public.expenses for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.monthly_history add column if not exists user_id uuid;
update public.monthly_history set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.monthly_history alter column user_id set default auth.uid();
alter table public.monthly_history alter column user_id set not null;
create index if not exists monthly_history_user_id_idx on public.monthly_history (user_id);
drop policy if exists "monthly_history_all" on public.monthly_history;
create policy "monthly_history_own" on public.monthly_history for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.invoices add column if not exists user_id uuid;
update public.invoices set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.invoices alter column user_id set default auth.uid();
alter table public.invoices alter column user_id set not null;
create index if not exists invoices_user_id_idx on public.invoices (user_id);
drop policy if exists "invoices_all" on public.invoices;
create policy "invoices_own" on public.invoices for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.invoice_items add column if not exists user_id uuid;
update public.invoice_items set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.invoice_items alter column user_id set default auth.uid();
alter table public.invoice_items alter column user_id set not null;
create index if not exists invoice_items_user_id_idx on public.invoice_items (user_id);
drop policy if exists "invoice_items_all" on public.invoice_items;
create policy "invoice_items_own" on public.invoice_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.invoice_payments add column if not exists user_id uuid;
update public.invoice_payments set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.invoice_payments alter column user_id set default auth.uid();
alter table public.invoice_payments alter column user_id set not null;
create index if not exists invoice_payments_user_id_idx on public.invoice_payments (user_id);
drop policy if exists "invoice_payments_all" on public.invoice_payments;
create policy "invoice_payments_own" on public.invoice_payments for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.provider_obligations add column if not exists user_id uuid;
update public.provider_obligations set user_id = '5e265e4f-5eff-428f-bdfe-7e31470ffbb9' where user_id is null;
alter table public.provider_obligations alter column user_id set default auth.uid();
alter table public.provider_obligations alter column user_id set not null;
create index if not exists provider_obligations_user_id_idx on public.provider_obligations (user_id);
drop policy if exists "provider_obligations_all" on public.provider_obligations;
create policy "provider_obligations_own" on public.provider_obligations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);