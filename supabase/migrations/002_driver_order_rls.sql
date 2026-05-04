create or replace function public.get_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select v.id
  from public.vendors v
  join public.profiles p on p.id = v.user_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.get_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.drivers d
  join public.profiles p on p.id = d.user_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_vendor_id() to authenticated;
grant execute on function public.get_driver_id() to authenticated;

alter table public.orders enable row level security;

grant select on public.orders to authenticated;
revoke update on public.orders from authenticated;
grant update (order_status, driver_id) on public.orders to authenticated;

create policy "admins can select all orders"
on public.orders
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

create policy "admins can update all orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "vendors can select own orders"
on public.orders
for select
to authenticated
using (vendor_id = public.get_vendor_id());

create policy "vendors can update own orders"
on public.orders
for update
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());

create policy "drivers can select own assigned orders"
on public.orders
for select
to authenticated
using (driver_id = public.get_driver_id());

create policy "drivers can update own assigned orders"
on public.orders
for update
to authenticated
using (driver_id = public.get_driver_id())
with check (driver_id = public.get_driver_id());
