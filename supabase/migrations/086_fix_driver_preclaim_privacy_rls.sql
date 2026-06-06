drop policy if exists "drivers can read customers for visible orders" on public.customers;
drop policy if exists "drivers can read customers for assigned orders" on public.customers;

create policy "drivers can read customers for assigned orders"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = customers.id
      and o.driver_id = public.get_driver_id()
  )
);

drop policy if exists "drivers can read delivery addresses for visible orders" on public.addresses;
drop policy if exists "drivers can read delivery addresses for assigned orders" on public.addresses;

create policy "drivers can read delivery addresses for assigned orders"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.delivery_address_id = addresses.id
      and o.driver_id = public.get_driver_id()
  )
);

drop policy if exists "drivers can read customer profile rows for visible orders by pr" on public.profiles;
drop policy if exists "drivers can read customer profiles for visible orders" on public.profiles;
drop policy if exists "drivers can read customer profiles for assigned orders" on public.profiles;

create policy "drivers can read customer profiles for assigned orders"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.user_id = profiles.id
      and o.driver_id = public.get_driver_id()
  )
);
