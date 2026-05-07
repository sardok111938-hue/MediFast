alter table public.customers enable row level security;
alter table public.addresses enable row level security;

grant select, insert on public.customers to authenticated;
revoke update on public.customers from authenticated;
grant update (user_id, default_address_id) on public.customers to authenticated;

grant select, insert on public.addresses to authenticated;
revoke update on public.addresses from authenticated;
grant update (label, line_1, line_2, city, area, lat, lng) on public.addresses to authenticated;

drop policy if exists "customers can select own customer row" on public.customers;
create policy "customers can select own customer row"
on public.customers
for select
to authenticated
using (id = public.get_customer_id());

drop policy if exists "customers can insert own customer row" on public.customers;
create policy "customers can insert own customer row"
on public.customers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.auth_user_id = auth.uid()
      and p.role = 'customer'
  )
  and (
    default_address_id is null
    or exists (
      select 1
      from public.addresses a
      where a.id = default_address_id
        and a.customer_id = id
    )
  )
);

drop policy if exists "customers can update own customer row" on public.customers;
create policy "customers can update own customer row"
on public.customers
for update
to authenticated
using (id = public.get_customer_id())
with check (
  id = public.get_customer_id()
  and exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.auth_user_id = auth.uid()
      and p.role = 'customer'
  )
  and (
    default_address_id is null
    or exists (
      select 1
      from public.addresses a
      where a.id = default_address_id
        and a.customer_id = id
    )
  )
);

drop policy if exists "admins can select all customers" on public.customers;
create policy "admins can select all customers"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "vendors can select customers for own orders" on public.customers;
create policy "vendors can select customers for own orders"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = id
      and o.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "drivers can select customers for assigned orders" on public.customers;
create policy "drivers can select customers for assigned orders"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = id
      and o.driver_id = public.get_driver_id()
  )
);

drop policy if exists "customers can select own addresses" on public.addresses;
create policy "customers can select own addresses"
on public.addresses
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "customers can insert own addresses" on public.addresses;
create policy "customers can insert own addresses"
on public.addresses
for insert
to authenticated
with check (customer_id = public.get_customer_id());

drop policy if exists "customers can update own addresses" on public.addresses;
create policy "customers can update own addresses"
on public.addresses
for update
to authenticated
using (customer_id = public.get_customer_id())
with check (customer_id = public.get_customer_id());

drop policy if exists "admins can select all addresses" on public.addresses;
create policy "admins can select all addresses"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "vendors can select addresses for own orders" on public.addresses;
create policy "vendors can select addresses for own orders"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.delivery_address_id = id
      and o.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "drivers can select addresses for assigned orders" on public.addresses;
create policy "drivers can select addresses for assigned orders"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.delivery_address_id = id
      and o.driver_id = public.get_driver_id()
  )
);
