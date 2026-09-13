create extension if not exists pgcrypto;

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuario',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'Activo',
  country text,
  contact text,
  email text,
  currency text not null default 'DOP',
  start_date date,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "clients_all" on public.clients for all to authenticated using (true) with check (true);

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  suggested_price numeric(14,2) not null default 0,
  estimated_cost numeric(14,2) not null default 0,
  status text not null default 'Activo',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "services_all" on public.services for all to authenticated using (true) with check (true);

-- PROVIDERS
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  specialty text,
  reference_rate numeric(14,2) not null default 0,
  status text not null default 'Activo',
  phone text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.providers to authenticated;
grant all on public.providers to service_role;
alter table public.providers enable row level security;
create policy "providers_all" on public.providers for all to authenticated using (true) with check (true);

-- CLIENT SERVICES
create table public.client_services (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  service_id uuid references public.services(id) on delete restrict,
  provider_id uuid references public.providers(id) on delete set null,
  sale_price numeric(14,2) not null default 0,
  cost numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.client_services to authenticated;
grant all on public.client_services to service_role;
alter table public.client_services enable row level security;
create policy "client_services_all" on public.client_services for all to authenticated using (true) with check (true);

-- INCOMES
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  concept text not null,
  amount numeric(14,2) not null,
  currency text not null default 'DOP',
  status text not null default 'Pendiente',
  invoice_date date not null default current_date,
  due_date date,
  paid_at date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.incomes to authenticated;
grant all on public.incomes to service_role;
alter table public.incomes enable row level security;
create policy "incomes_all" on public.incomes for all to authenticated using (true) with check (true);

-- EXPENSES
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  category text,
  concept text not null,
  amount numeric(14,2) not null,
  currency text not null default 'DOP',
  status text not null default 'Pendiente',
  expense_date date not null default current_date,
  due_date date,
  paid_at date,
  direct_cost boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "expenses_all" on public.expenses for all to authenticated using (true) with check (true);

-- MONTHLY HISTORY
create table public.monthly_history (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  income numeric(14,2) not null default 0,
  expenses numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.monthly_history to authenticated;
grant all on public.monthly_history to service_role;
alter table public.monthly_history enable row level security;
create policy "monthly_history_all" on public.monthly_history for all to authenticated using (true) with check (true);

-- APP SETTINGS (single shared row)
create table public.app_settings (
  id integer primary key default 1,
  agency text not null default 'Skyloop',
  currency text not null default 'DOP',
  usd_rate numeric(14,4) not null default 60,
  overhead_method text not null default 'revenue',
  updated_at timestamptz not null default now(),
  constraint app_settings_single_row check (id = 1)
);
grant select, insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "app_settings_all" on public.app_settings for all to authenticated using (true) with check (true);

create index idx_income_client_date on public.incomes(client_id, invoice_date);
create index idx_expense_client_date on public.expenses(client_id, expense_date);
create index idx_expense_provider_date on public.expenses(provider_id, expense_date);

-- SEED DATA
insert into public.app_settings (id, agency, currency, usd_rate, overhead_method)
values (1, 'Skyloop', 'DOP', 60, 'revenue');

insert into public.monthly_history (month, income, expenses) values
  ('2026-07', 84500, 25000),
  ('2026-08', 154377, 45500),
  ('2026-09', 226376.75, 45500);

insert into public.clients (id, name, status, country, currency, start_date, notes) values
  ('11111111-0000-4000-8000-000000000001','Abordo Magazine','Activo','Rep. Dominicana','DOP','2026-07-01','Cliente recurrente de contenido.'),
  ('11111111-0000-4000-8000-000000000002','Purpose ID','Activo',null,'DOP','2026-08-01',null),
  ('11111111-0000-4000-8000-000000000003','Japana Motors','Activo','Rep. Dominicana','DOP','2026-07-01',null),
  ('11111111-0000-4000-8000-000000000004','AdAutos','Activo','Rep. Dominicana','DOP','2026-07-01','Dealer automotriz.'),
  ('11111111-0000-4000-8000-000000000005','Blinds & Shutters','Prospecto',null,'DOP','2026-09-01',null);

insert into public.services (id, name, category, suggested_price, estimated_cost, status) values
  ('22222222-0000-4000-8000-000000000001','Manejo de redes','Social Media',30000,12000,'Activo'),
  ('22222222-0000-4000-8000-000000000002','Community Management','Social Media',8000,5000,'Activo'),
  ('22222222-0000-4000-8000-000000000003','Diseño gráfico','Diseño',10000,5000,'Activo'),
  ('22222222-0000-4000-8000-000000000004','Producción audiovisual','Contenido',25000,14000,'Activo'),
  ('22222222-0000-4000-8000-000000000005','Fotografía','Contenido',18000,11500,'Activo'),
  ('22222222-0000-4000-8000-000000000006','Meta Ads','Paid Media',12000,5640,'Activo'),
  ('22222222-0000-4000-8000-000000000007','Reporte de métricas','Analítica',2500,1000,'Activo'),
  ('22222222-0000-4000-8000-000000000008','Calendario mensual','Estrategia',2500,500,'Activo'),
  ('22222222-0000-4000-8000-000000000009','Landing Page','Web',50000,25000,'Activo'),
  ('22222222-0000-4000-8000-000000000010','Brandbook','Branding',15000,7800,'Activo');

insert into public.providers (id, name, specialty, reference_rate, status) values
  ('33333333-0000-4000-8000-000000000001','Manuel','Diseño · Audiovisual · Fotografía',0,'Activo'),
  ('33333333-0000-4000-8000-000000000002','Juan','Community Management',5000,'Activo'),
  ('33333333-0000-4000-8000-000000000003','Scarla','Diseño gráfico',0,'Activo'),
  ('33333333-0000-4000-8000-000000000004','Kristian','Audiovisual',14000,'Activo'),
  ('33333333-0000-4000-8000-000000000005','Alma','Fotografía',11500,'Activo'),
  ('33333333-0000-4000-8000-000000000006','Miguel','Manejo de redes',30000,'Activo');

insert into public.client_services (client_id, service_id, provider_id, sale_price, cost, active) values
  ('11111111-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000004',0,14000,true),
  ('11111111-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000002','33333333-0000-4000-8000-000000000002',0,5000,true),
  ('11111111-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000008','33333333-0000-4000-8000-000000000001',0,500,true),
  ('11111111-0000-4000-8000-000000000004','22222222-0000-4000-8000-000000000007','33333333-0000-4000-8000-000000000001',0,500,true),
  ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000003','33333333-0000-4000-8000-000000000001',0,5000,true),
  ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000004',0,12000,true),
  ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000008','33333333-0000-4000-8000-000000000001',0,500,true),
  ('11111111-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000007','33333333-0000-4000-8000-000000000001',0,1000,true);

insert into public.incomes (client_id, concept, amount, currency, status, invoice_date, due_date) values
  ('11111111-0000-4000-8000-000000000001','Mensualidad septiembre',72000,'DOP','Cobrado','2026-09-01','2026-09-05'),
  ('11111111-0000-4000-8000-000000000002','Mensualidad septiembre',120000,'DOP','Cobrado','2026-09-01','2026-09-05'),
  ('11111111-0000-4000-8000-000000000003','Mensualidad septiembre',10000,'DOP','Cobrado','2026-09-01','2026-09-05'),
  ('11111111-0000-4000-8000-000000000004','Mensualidad septiembre',24376.75,'DOP','Cobrado','2026-09-01','2026-09-05');

insert into public.expenses (client_id, provider_id, category, concept, amount, currency, status, expense_date, due_date, direct_cost) values
  ('11111111-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000004','Audiovisual','7 videos grabados y editados',14000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000002','Community Management','Community Manager',5000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000004',null,'Talentos','Talentos',2000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000004','33333333-0000-4000-8000-000000000001','Estrategia','Calendario + reporte',1000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Diseño','7 posts mensuales',5000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000004','Audiovisual','4 reels grabados y editados',12000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Estrategia','Calendario y reporte de métricas',1500,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  ('11111111-0000-4000-8000-000000000001','33333333-0000-4000-8000-000000000001','Diseño','Info y artes',5000,'DOP','Pendiente','2026-09-03','2026-09-15',true),
  (null,'33333333-0000-4000-8000-000000000001','Proyecto','50% Landing Page - inicio',25000,'DOP','Pendiente','2026-09-03','2026-09-15',false),
  (null,'33333333-0000-4000-8000-000000000001','Proyecto','50% Landing Page - segundo pago',25000,'DOP','Pendiente','2026-09-03','2026-09-30',false),
  (null,'33333333-0000-4000-8000-000000000001','Paid Media','ADS Meta',5640,'DOP','Pendiente','2026-09-03','2026-09-15',false),
  (null,'33333333-0000-4000-8000-000000000001','Branding','BrandBook',7800,'DOP','Pendiente','2026-09-03','2026-09-15',false),
  (null,'33333333-0000-4000-8000-000000000005','Fotografía','Fotografías a AutoMarina',11500,'DOP','Pendiente','2026-09-03','2026-09-15',false),
  (null,'33333333-0000-4000-8000-000000000006','Social Media','Manejo de Redes',30000,'DOP','Pendiente','2026-09-03','2026-09-30',false);
