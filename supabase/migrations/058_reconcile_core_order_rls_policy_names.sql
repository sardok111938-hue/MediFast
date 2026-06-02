-- Addresses: replace legacy policy names with current production policy model

drop policy if exists "admins can select all addresses" on public.addresses;
drop policy if exists "customers can insert own addresses" on public.addresses;
drop policy if exists "customers can select own addresses" on public.addresses;
drop policy if exists "customers can update own addresses" on public.addresses;
drop policy if exists "drivers can select addresses for assigned orders" on public.addresses;
drop policy if exists "vendors can select addresses for own orders" on public.addresses;

drop policy if exists "Customers can insert own addresses" on public.addresses;
create policy "Customers can insert own addresses"
on public.addresses
for insert
to authenticated
with check (customer_id = public.get_customer_id());

drop policy if exists "Customers can view own addresses" on public.addresses;
create policy "Customers can view own addresses"
on public.addresses
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "customers can delete own addresses" on public.addresses;
create policy "customers can delete own addresses"
on public.addresses
for delete
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "drivers can read delivery addresses for visible orders" on public.addresses;
create policy "drivers can read delivery addresses for visible orders"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.delivery_address_id = addresses.id
      and (
        o.driver_id = public.get_driver_id()
        or (
          o.order_status = 'ready_for_pickup'
          and o.driver_id is null
        )
      )
  )
);

drop policy if exists "vendors can read prescription request addresses" on public.addresses;
create policy "vendors can read prescription request addresses"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.prescription_requests pr
    where pr.address_id = addresses.id
      and pr.vendor_id = public.get_vendor_id()
  )
);

-- Customers: replace legacy policy names with current production policy model

drop policy if exists "admins can select all customers" on public.customers;
drop policy if exists "customers can insert own customer row" on public.customers;
drop policy if exists "customers can select own customer row" on public.customers;
drop policy if exists "customers can update own customer row" on public.customers;
drop policy if exists "drivers can select customers for assigned orders" on public.customers;
drop policy if exists "vendors can select customers for own orders" on public.customers;

drop policy if exists "Admins can read customers" on public.customers;
create policy "Admins can read customers"
on public.customers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Customers can read own customer row" on public.customers;
create policy "Customers can read own customer row"
on public.customers
for select
to authenticated
using (id = public.get_customer_id());

drop policy if exists "Customers can update own customer row" on public.customers;
create policy "Customers can update own customer row"
on public.customers
for update
to authenticated
using (id = public.get_customer_id())
with check (id = public.get_customer_id());

drop policy if exists "drivers can read customers for visible orders" on public.customers;
create policy "drivers can read customers for visible orders"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = customers.id
      and (
        o.driver_id = public.get_driver_id()
        or (
          o.order_status = 'ready_for_pickup'
          and o.driver_id is null
        )
      )
  )
);

drop policy if exists "vendors can read prescription request customers" on public.customers;
create policy "vendors can read prescription request customers"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.prescription_requests pr
    where pr.customer_id = customers.id
      and pr.vendor_id = public.get_vendor_id()
  )
);

-- Orders: replace legacy policy names with current production policy model

drop policy if exists "admins can select all orders" on public.orders;
drop policy if exists "admins can update all orders" on public.orders;
drop policy if exists "customers can select own orders" on public.orders;
drop policy if exists "drivers can select own assigned orders" on public.orders;
drop policy if exists "drivers can update own assigned orders" on public.orders;

drop policy if exists "Admins can read orders" on public.orders;
create policy "Admins can read orders"
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can update orders driver" on public.orders;
create policy "Admins can update orders driver"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
on public.orders
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "Drivers can read available pickup orders" on public.orders;
create policy "Drivers can read available pickup orders"
on public.orders
for select
to authenticated
using (
  order_status = 'ready_for_pickup'
  and driver_id is null
  and public.get_driver_id() is not null
);

drop policy if exists "Drivers can read own orders" on public.orders;
create policy "Drivers can read own orders"
on public.orders
for select
to authenticated
using (driver_id = public.get_driver_id());

drop policy if exists "Drivers can update own orders" on public.orders;
create policy "Drivers can update own orders"
on public.orders
for update
to authenticated
using (driver_id = public.get_driver_id())
with check (driver_id = public.get_driver_id());

drop policy if exists "Vendors can read own orders" on public.orders;
create policy "Vendors can read own orders"
on public.orders
for select
to authenticated
using (vendor_id = public.get_vendor_id());

drop policy if exists "Vendors can update own orders" on public.orders;
create policy "Vendors can update own orders"
on public.orders
for update
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());