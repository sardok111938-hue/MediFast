drop policy if exists "available drivers can select pickup-ready customers" on public.customers;

create policy "available drivers can select pickup-ready customers"
on public.customers
for select
to authenticated
using (
  public.is_current_user_available_driver()
  and exists (
    select 1
    from public.orders o
    where o.customer_id = customers.id
      and o.order_status = 'ready_for_pickup'
      and o.driver_id is null
  )
);

drop policy if exists "available drivers can select pickup-ready addresses" on public.addresses;

create policy "available drivers can select pickup-ready addresses"
on public.addresses
for select
to authenticated
using (
  public.is_current_user_available_driver()
  and exists (
    select 1
    from public.orders o
    where o.delivery_address_id = addresses.id
      and o.order_status = 'ready_for_pickup'
      and o.driver_id is null
  )
);
