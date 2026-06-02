alter table public.notifications enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "customers can read own order items" on public.order_items;

drop policy if exists "Admins can read order_items" on public.order_items;
create policy "Admins can read order_items"
on public.order_items
for select
to authenticated
using (public.is_admin());

drop policy if exists "Customers can read own order_items" on public.order_items;
create policy "Customers can read own order_items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = public.get_customer_id()
  )
);

drop policy if exists "vendors can read order items" on public.order_items;
create policy "vendors can read order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "drivers can read assigned order items" on public.order_items;
create policy "drivers can read assigned order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.driver_id = public.get_driver_id()
  )
);
