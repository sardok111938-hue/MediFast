-- Finalize same-pharmacy driver batching and simplified driver lifecycle.
--
-- Rules:
-- 1. Driver can hold max 2 active orders.
-- 2. Active batched orders must be from the same pharmacy/vendor.
-- 3. Driver lifecycle is:
--    assigned -> picked_up -> on_the_way -> delivered
--
-- Legacy arrived_at_pharmacy remains in the enum/schema but is not used for MVP batching.

create or replace function public.admin_assign_driver(
  p_order_id uuid,
  p_driver_id uuid
)
returns table(order_id uuid, driver_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_order public.orders%rowtype;
  current_driver public.drivers%rowtype;
  active_order_count integer;
  active_vendor_id uuid;
  active_vendor_count integer;
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

  if current_order.driver_id is not null then
    raise exception 'Order is already assigned to a driver.';
  end if;

  select *
  into current_driver
  from public.drivers d
  where d.id = p_driver_id
  for update;

  if not found then
    raise exception 'Selected driver was not found.';
  end if;

  if current_driver.approval_status <> 'approved' then
    raise exception 'Selected driver is not approved.';
  end if;

  select
    count(*)::integer,
    min(o.vendor_id),
    count(distinct o.vendor_id)::integer
  into active_order_count, active_vendor_id, active_vendor_count
  from public.orders o
  where o.driver_id = p_driver_id
    and o.order_status in (
      'assigned',
      'picked_up',
      'on_the_way'
    );

  if active_vendor_count > 1 then
    raise exception 'Driver has active orders from multiple pharmacies and cannot receive another batch order.';
  end if;

  if active_order_count >= 2 then
    raise exception 'Driver already has the maximum active orders.';
  end if;

  if active_order_count > 0 and active_vendor_id <> current_order.vendor_id then
    raise exception 'Driver can only batch active orders from the same pharmacy.';
  end if;

  if active_order_count = 0 and not current_driver.is_available then
    raise exception 'Selected driver is not currently available for assignment.';
  end if;

  update public.orders o
  set
    driver_id = p_driver_id,
    order_status = 'assigned',
    assigned_at = case
      when o.assigned_at is null then now()
      else o.assigned_at
    end
  where o.id = current_order.id;

  update public.drivers d
  set is_available = (active_order_count + 1) < 2
  where d.id = p_driver_id;

  perform public.notify_customer_order_status(
    current_order.customer_id,
    current_order.id,
    'assigned'
  );

  perform public.notify_driver_order_assigned(
    p_driver_id,
    current_order.id
  );

  return query
  select o.id, o.driver_id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$function$;

create or replace function public.driver_claim_order(
  p_order_id uuid
)
returns table(order_id uuid, driver_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_driver_id uuid;
  current_driver public.drivers%rowtype;
  current_order public.orders%rowtype;
  active_order_count integer;
  active_vendor_id uuid;
  active_vendor_count integer;
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

  if current_driver.approval_status <> 'approved' then
    raise exception 'Driver is not approved.';
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

  select
    count(*)::integer,
    min(o.vendor_id),
    count(distinct o.vendor_id)::integer
  into active_order_count, active_vendor_id, active_vendor_count
  from public.orders o
  where o.driver_id = current_driver_id
    and o.order_status in (
      'assigned',
      'picked_up',
      'on_the_way'
    );

  if active_vendor_count > 1 then
    raise exception 'Driver has active orders from multiple pharmacies and cannot receive another batch order.';
  end if;

  if active_order_count >= 2 then
    raise exception 'Driver already has the maximum active orders.';
  end if;

  if active_order_count > 0 and active_vendor_id <> current_order.vendor_id then
    raise exception 'Driver can only batch active orders from the same pharmacy.';
  end if;

  if active_order_count = 0 and not current_driver.is_available then
    raise exception 'Driver is not currently available for assignment.';
  end if;

  return query
  with updated_order as (
    update public.orders o
    set
      driver_id = current_driver_id,
      order_status = 'assigned',
      assigned_at = case
        when o.assigned_at is null then now()
        else o.assigned_at
      end
    where o.id = current_order.id
    returning o.id, o.driver_id, o.order_status
  ),
  updated_driver as (
    update public.drivers d
    set is_available = (active_order_count + 1) < 2
    where d.id = current_driver_id
    returning d.id
  ),
  queued_notifications as (
    select
      public.notify_customer_order_status(
        current_order.customer_id,
        current_order.id,
        'assigned'
      ),
      public.notify_driver_order_assigned(
        current_driver_id,
        current_order.id
      )
  )
  select uo.id, uo.driver_id, uo.order_status::text
  from updated_order uo;
end;
$function$;

create or replace function public.driver_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns table(order_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_driver_id uuid;
  current_order public.orders%rowtype;
  resolved_next_status public.order_status;
  active_order_count integer;
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
    (current_order.order_status = 'assigned' and resolved_next_status = 'picked_up')
    or (current_order.order_status = 'picked_up' and resolved_next_status = 'on_the_way')
    or (current_order.order_status = 'on_the_way' and resolved_next_status = 'delivered')
  ) then
    raise exception 'Invalid driver order transition from % to %.', current_order.order_status, resolved_next_status;
  end if;

  update public.orders o
  set
    order_status = resolved_next_status,
    payment_status = case
      when resolved_next_status = 'delivered'
        and o.payment_method = 'cash_on_delivery'
      then 'collected'
      else o.payment_status
    end,
    picked_up_at = case
      when resolved_next_status = 'picked_up' and o.picked_up_at is null then now()
      else o.picked_up_at
    end,
    on_the_way_at = case
      when resolved_next_status = 'on_the_way' and o.on_the_way_at is null then now()
      else o.on_the_way_at
    end,
    delivered_at = case
      when resolved_next_status = 'delivered' and o.delivered_at is null then now()
      else o.delivered_at
    end
  where o.id = current_order.id;

  if resolved_next_status = 'delivered' then
    select count(*)::integer
    into active_order_count
    from public.orders o
    where o.driver_id = current_driver_id
      and o.id <> current_order.id
      and o.order_status in (
        'assigned',
        'picked_up',
        'on_the_way'
      );

    update public.drivers d
    set is_available = active_order_count < 2
    where d.id = current_driver_id;
  end if;

  perform public.notify_customer_order_status(
    current_order.customer_id,
    current_order.id,
    resolved_next_status::text
  );

  return query
  select o.id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$function$;

grant execute on function public.admin_assign_driver(uuid, uuid) to authenticated;
grant execute on function public.driver_claim_order(uuid) to authenticated;
grant execute on function public.driver_update_order_status(uuid, text) to authenticated;