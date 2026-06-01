-- DB reproducibility base objects required before prescription/favorites/settings migrations.

-- Customer bootstrap RPC referenced by customer app.
drop function if exists public.ensure_customer_account(text, text);

create or replace function public.ensure_customer_account(
  p_full_name text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
begin
  select id
  into v_profile_id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  if v_profile_id is null then
    insert into public.profiles (auth_user_id, full_name, phone, role)
    values (
      auth.uid(),
      coalesce(nullif(trim(p_full_name), ''), 'Customer'),
      nullif(trim(p_phone), ''),
      'customer'
    )
    returning id into v_profile_id;
  end if;

  select id
  into v_customer_id
  from public.customers
  where user_id = v_profile_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers (user_id)
    values (v_profile_id)
    returning id into v_customer_id;
  end if;

  return v_customer_id;
end;
$$;

grant execute on function public.ensure_customer_account(text, text) to authenticated;


create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

drop policy if exists "authenticated users can read platform settings" on public.platform_settings;
create policy "authenticated users can read platform settings"
on public.platform_settings
for select
to authenticated
using (true);

drop policy if exists "admins can manage platform settings" on public.platform_settings;
create policy "admins can manage platform settings"
on public.platform_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.platform_settings to authenticated;
grant insert, update, delete on public.platform_settings to authenticated;


create table if not exists public.vendor_operating_hours (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, day_of_week)
);

alter table public.vendor_operating_hours enable row level security;

drop policy if exists "authenticated users can read vendor operating hours" on public.vendor_operating_hours;
create policy "authenticated users can read vendor operating hours"
on public.vendor_operating_hours
for select
to authenticated
using (true);

drop policy if exists "vendors can manage own operating hours" on public.vendor_operating_hours;
create policy "vendors can manage own operating hours"
on public.vendor_operating_hours
for all
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());

grant select, insert, update, delete on public.vendor_operating_hours to authenticated;


create table if not exists public.customer_favorite_products (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint customer_favorite_products_unique unique (customer_id, product_id)
);

alter table public.customer_favorite_products enable row level security;

drop policy if exists "customers can read own favorite products" on public.customer_favorite_products;
create policy "customers can read own favorite products"
on public.customer_favorite_products
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "customers can add own favorite products" on public.customer_favorite_products;
create policy "customers can add own favorite products"
on public.customer_favorite_products
for insert
to authenticated
with check (customer_id = public.get_customer_id());

drop policy if exists "customers can remove own favorite products" on public.customer_favorite_products;
create policy "customers can remove own favorite products"
on public.customer_favorite_products
for delete
to authenticated
using (customer_id = public.get_customer_id());

grant select, insert, delete on public.customer_favorite_products to authenticated;


create table if not exists public.customer_favorite_vendors (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint customer_favorite_vendors_unique unique (customer_id, vendor_id)
);

alter table public.customer_favorite_vendors enable row level security;

drop policy if exists "customers can read own favorite vendors" on public.customer_favorite_vendors;
create policy "customers can read own favorite vendors"
on public.customer_favorite_vendors
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "customers can add own favorite vendors" on public.customer_favorite_vendors;
create policy "customers can add own favorite vendors"
on public.customer_favorite_vendors
for insert
to authenticated
with check (customer_id = public.get_customer_id());

drop policy if exists "customers can remove own favorite vendors" on public.customer_favorite_vendors;
create policy "customers can remove own favorite vendors"
on public.customer_favorite_vendors
for delete
to authenticated
using (customer_id = public.get_customer_id());

grant select, insert, delete on public.customer_favorite_vendors to authenticated;


create table if not exists public.prescription_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  address_id uuid not null references public.addresses(id) on delete restrict,
  image_path text not null,
  image_url text,
  notes text,
  vendor_note text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prescription_requests_customer_id_idx
on public.prescription_requests(customer_id);

create index if not exists prescription_requests_vendor_id_idx
on public.prescription_requests(vendor_id);

create index if not exists prescription_requests_status_idx
on public.prescription_requests(status);

create index if not exists prescription_requests_created_at_idx
on public.prescription_requests(created_at desc);

alter table public.prescription_requests enable row level security;

drop policy if exists "customers can create own prescription requests" on public.prescription_requests;
create policy "customers can create own prescription requests"
on public.prescription_requests
for insert
to authenticated
with check (
  customer_id = public.get_customer_id()
  and status = 'pending'
);

drop policy if exists "customers can view own prescription requests" on public.prescription_requests;
create policy "customers can view own prescription requests"
on public.prescription_requests
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "vendors can view own prescription requests" on public.prescription_requests;
create policy "vendors can view own prescription requests"
on public.prescription_requests
for select
to authenticated
using (vendor_id = public.get_vendor_id());

drop policy if exists "customers can cancel own pending prescription requests" on public.prescription_requests;
create policy "customers can cancel own pending prescription requests"
on public.prescription_requests
for update
to authenticated
using (
  customer_id = public.get_customer_id()
  and status = 'pending'
)
with check (
  customer_id = public.get_customer_id()
  and status = 'cancelled'
);

drop policy if exists "vendors can accept or reject own pending prescription requests" on public.prescription_requests;
create policy "vendors can accept or reject own pending prescription requests"
on public.prescription_requests
for update
to authenticated
using (
  vendor_id = public.get_vendor_id()
  and status = 'pending'
)
with check (
  vendor_id = public.get_vendor_id()
  and status in ('accepted', 'rejected')
);

grant select, insert, update on public.prescription_requests to authenticated;
