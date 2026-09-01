-- Allow administrators to cancel orders before physical pickup.
--
-- Allowed source states:
--   placed
--   accepted
--   preparing
--   ready_for_pickup
--   assigned
--
-- Block cancellation after pickup/delivery and from terminal states.
-- Inventory is restored exactly once.
-- Assigned driver_id is retained for audit history.
-- Driver availability is recomputed from remaining active orders.

create or replace function public.admin_cancel_order(
  p_order_id uuid
)
returns table(order_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_order public.orders%rowtype;
  active_order_count integer;
begin
  if not public.is_admin() then
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

  if current_order.order_status not in (
    'placed',
    'accepted',
    'preparing',
    'ready_for_pickup',
    'assigned'
  ) then
    raise exception
      'Order cannot be cancelled from status %.',
      current_order.order_status;
  end if;

  -- Lock affected product rows in deterministic order before restoring stock.
  perform 1
  from public.products p
  join (
    select
      oi.product_id,
      sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = current_order.id
      and oi.product_id is not null
    group by oi.product_id
  ) restored
    on restored.product_id = p.id
  order by p.id
  for update of p;

  update public.products p
  set stock_quantity = p.stock_quantity + restored.quantity
  from (
    select
      oi.product_id,
      sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = current_order.id
      and oi.product_id is not null
    group by oi.product_id
  ) restored
  where p.id = restored.product_id;

  update public.orders o
  set
    order_status = 'cancelled',
    cancelled_at = coalesce(o.cancelled_at, now())
  where o.id = current_order.id;

  if current_order.order_status = 'assigned'
     and current_order.driver_id is not null then

    -- Lock the driver row before recomputing assignment capacity.
    perform 1
    from public.drivers d
    where d.id = current_order.driver_id
    for update;

    select count(*)::integer
    into active_order_count
    from public.orders o
    where o.driver_id = current_order.driver_id
      and o.id <> current_order.id
      and o.order_status in (
        'assigned',
        'picked_up',
        'on_the_way'
      );

    update public.drivers d
    set is_available = active_order_count < 2
    where d.id = current_order.driver_id;
  end if;

  perform public.notify_customer_order_status(
    current_order.customer_id,
    current_order.id,
    'cancelled'
  );

  return query
  select o.id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$function$;

revoke execute on function public.admin_cancel_order(uuid)
from public, anon;

grant execute on function public.admin_cancel_order(uuid)
to authenticated;

grant execute on function public.admin_cancel_order(uuid)
to service_role;
