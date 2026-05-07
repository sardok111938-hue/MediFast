create or replace function public.vendor_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns table (
  order_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  current_order public.orders%rowtype;
  resolved_next_status public.order_status;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  resolved_next_status := trim(coalesce(p_next_status, ''))::public.order_status;

  select *
  into current_order
  from public.orders o
  where o.id = p_order_id
    and o.vendor_id = current_vendor_id
  for update;

  if not found then
    raise exception 'Order was not found for this vendor.';
  end if;

  if not (
    (current_order.order_status = 'placed' and resolved_next_status in ('accepted', 'rejected'))
    or (current_order.order_status = 'accepted' and resolved_next_status = 'preparing')
    or (current_order.order_status = 'preparing' and resolved_next_status = 'ready_for_pickup')
  ) then
    raise exception 'Invalid vendor order transition from % to %.', current_order.order_status, resolved_next_status;
  end if;

  return query
  update public.orders o
  set order_status = resolved_next_status
  where o.id = current_order.id
  returning o.id, o.order_status::text;
end;
$$;

grant execute on function public.vendor_update_order_status(uuid, text) to authenticated;

create or replace function public.driver_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns table (
  order_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_driver_id uuid;
  current_order public.orders%rowtype;
  resolved_next_status public.order_status;
begin
  current_driver_id := public.get_driver_id();

  if current_driver_id is null then
    raise exception 'Driver account is not linked correctly.';
  end if;

  resolved_next_status := trim(coalesce(p_next_status, ''))::public.order_status;

  select *
  into current_order
  from public.orders o
  where o.id = p_order_id
    and o.driver_id = current_driver_id
  for update;

  if not found then
    raise exception 'Order was not found for this driver.';
  end if;

  if not (
    (current_order.order_status = 'assigned' and resolved_next_status = 'on_the_way')
    or (current_order.order_status = 'on_the_way' and resolved_next_status = 'delivered')
  ) then
    raise exception 'Invalid driver order transition from % to %.', current_order.order_status, resolved_next_status;
  end if;

  return query
  with updated_order as (
    update public.orders o
    set order_status = resolved_next_status
    where o.id = current_order.id
    returning o.id, o.order_status
  ), updated_driver as (
    update public.drivers d
    set is_available = case when resolved_next_status = 'delivered' then true else d.is_available end
    where d.id = current_driver_id
    returning d.id
  )
  select uo.id, uo.order_status::text
  from updated_order uo;
end;
$$;

grant execute on function public.driver_update_order_status(uuid, text) to authenticated;

create or replace function public.admin_assign_driver(
  p_order_id uuid,
  p_driver_id uuid
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
  current_order public.orders%rowtype;
  current_driver public.drivers%rowtype;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  select *
  into current_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if current_order.order_status <> 'ready_for_pickup' then
    raise exception 'Only ready-for-pickup orders can be assigned.';
  end if;

  select *
  into current_driver
  from public.drivers d
  where d.id = p_driver_id
  for update;

  if not found then
    raise exception 'Selected driver was not found.';
  end if;

  if current_driver.approval_status <> 'approved' or not current_driver.is_available then
    raise exception 'Selected driver is not currently available for assignment.';
  end if;

  return query
  with updated_order as (
    update public.orders o
    set driver_id = p_driver_id,
        order_status = 'assigned'
    where o.id = current_order.id
    returning o.id, o.driver_id, o.order_status
  ), updated_driver as (
    update public.drivers d
    set is_available = false
    where d.id = p_driver_id
    returning d.id
  )
  select uo.id, uo.driver_id, uo.order_status::text
  from updated_order uo;
end;
$$;

grant execute on function public.admin_assign_driver(uuid, uuid) to authenticated;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns table (
  order_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  resolved_next_status public.order_status;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  resolved_next_status := trim(coalesce(p_next_status, ''))::public.order_status;

  select *
  into current_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if resolved_next_status = 'assigned' and current_order.driver_id is null then
    raise exception 'Use driver assignment to move an order to assigned.';
  end if;

  update public.orders o
  set order_status = resolved_next_status
  where o.id = current_order.id;

  if current_order.driver_id is not null and resolved_next_status in ('delivered', 'cancelled', 'rejected') then
    update public.drivers d
    set is_available = true
    where d.id = current_order.driver_id;
  end if;

  return query
  select o.id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$$;

grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
