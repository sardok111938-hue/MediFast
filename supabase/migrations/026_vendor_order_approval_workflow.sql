drop policy if exists "vendors can select own orders" on public.orders;
create policy "vendors can select own orders"
on public.orders
for select
to authenticated
using (vendor_id = public.get_vendor_id());

drop policy if exists "vendors can update own orders" on public.orders;
create policy "vendors can update own orders"
on public.orders
for update
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());

drop function if exists public.vendor_update_order_status(uuid, text);

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
    and o.vendor_id = current_vendor_id
  returning o.id, o.order_status::text;
end;
$$;

grant execute on function public.vendor_update_order_status(uuid, text) to authenticated;

create or replace function public.enforce_order_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_role public.user_role;
  current_vendor_id uuid;
  current_driver_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  select p.role
  into current_profile_role
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;

  if current_profile_role is null then
    raise exception 'Current authenticated profile could not be resolved.';
  end if;

  if current_profile_role = 'admin' then
    return new;
  end if;

  if new.driver_id is distinct from old.driver_id and current_profile_role <> 'admin' then
    raise exception 'Only administrators can reassign drivers.';
  end if;

  if current_profile_role = 'vendor' then
    current_vendor_id := public.get_vendor_id();

    if current_vendor_id is null or current_vendor_id <> old.vendor_id then
      raise exception 'Vendors can update only their own orders.';
    end if;

    if not (
      (old.order_status = 'placed' and new.order_status in ('accepted', 'rejected'))
      or (old.order_status = 'accepted' and new.order_status = 'preparing')
      or (old.order_status = 'preparing' and new.order_status = 'ready_for_pickup')
      or (old.order_status = new.order_status)
    ) then
      raise exception 'Invalid vendor order transition from % to %.', old.order_status, new.order_status;
    end if;

    return new;
  end if;

  if current_profile_role = 'driver' then
    current_driver_id := public.get_driver_id();

    if current_driver_id is null or current_driver_id <> old.driver_id then
      raise exception 'Drivers can update only their assigned orders.';
    end if;

    if not (
      (old.order_status = 'assigned' and new.order_status = 'on_the_way')
      or (old.order_status = 'on_the_way' and new.order_status = 'delivered')
      or (old.order_status = new.order_status)
    ) then
      raise exception 'Invalid driver order transition from % to %.', old.order_status, new.order_status;
    end if;

    return new;
  end if;

  raise exception 'This role is not allowed to update orders.';
end;
$$;
