create policy "vendors can read customers for own orders"
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.customer_id = customers.id
      and o.vendor_id = public.get_vendor_id()
  )
);

create policy "vendors can read assigned drivers for own orders"
on public.drivers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.driver_id = drivers.id
      and o.vendor_id = public.get_vendor_id()
  )
);

create policy "vendors can read delivery addresses for own orders"
on public.addresses
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.delivery_address_id = addresses.id
      and o.vendor_id = public.get_vendor_id()
  )
);