create or replace function public.is_current_user_available_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = d.user_id
    where p.auth_user_id = auth.uid()
      and p.role = 'driver'
      and d.approval_status = 'approved'
      and d.is_available = true
  );
$$;

grant execute on function public.is_current_user_available_driver() to authenticated;

drop policy if exists "available drivers can select pickup-ready orders" on public.orders;
create policy "available drivers can select pickup-ready orders"
on public.orders
for select
to authenticated
using (
  order_status = 'ready_for_pickup'
  and driver_id is null
  and public.is_current_user_available_driver()
);

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
    where o.customer_id = id
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
    where o.delivery_address_id = id
      and o.order_status = 'ready_for_pickup'
      and o.driver_id is null
  )
);

create or replace function public.driver_claim_order(
  p_order_id uuid
)
returns table (
  order_id uuid,
  driver_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_driver_id uuid;
  current_driver public.drivers%rowtype;
  current_order public.orders%rowtype;
begin
  current_driver_id := public.get_driver_id();

  if current_driver_id is null then
    raise exception 'Driver account is not linked correctly.';
  end if;

  select *
  into current_driver
  from public.drivers d
  where d.id = current_driver_id
  for update;

  if not found then
    raise exception 'Driver was not found.';
  end if;

  if current_driver.approval_status <> 'approved' or not current_driver.is_available then
    raise exception 'Driver is not currently available for assignment.';
  end if;

  select *
  into current_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if current_order.order_status <> 'ready_for_pickup' or current_order.driver_id is not null then
    raise exception 'Only unassigned ready-for-pickup orders can be claimed.';
  end if;

  return query
  with updated_order as (
    update public.orders o
    set driver_id = current_driver_id,
        order_status = 'assigned'
    where o.id = current_order.id
    returning o.id, o.driver_id, o.order_status
  ), updated_driver as (
    update public.drivers d
    set is_available = false
    where d.id = current_driver_id
    returning d.id
  )
  select uo.id, uo.driver_id, uo.order_status::text
  from updated_order uo;
end;
$$;

grant execute on function public.driver_claim_order(uuid) to authenticated;
