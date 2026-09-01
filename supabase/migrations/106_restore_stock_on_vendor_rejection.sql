-- Restore reserved stock when a vendor rejects a placed order.
--
-- Stock is deducted when an order is created. Previously, the vendor
-- placed -> rejected transition changed only order_status, leaving
-- rejected orders with inventory permanently deducted.
--
-- Keep this migration narrowly scoped to vendor rejection integrity.

create or replace function public.vendor_update_order_status(
  p_order_id uuid,
  p_next_status text
)
returns table(order_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_vendor_id uuid;
  current_order public.orders%rowtype;
  resolved_next_status public.order_status;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  resolved_next_status :=
    trim(coalesce(p_next_status, ''))::public.order_status;

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
    (
      current_order.order_status = 'placed'
      and resolved_next_status in ('accepted', 'rejected')
    )
    or (
      current_order.order_status = 'accepted'
      and resolved_next_status = 'preparing'
    )
    or (
      current_order.order_status = 'preparing'
      and resolved_next_status = 'ready_for_pickup'
    )
  ) then
    raise exception
      'Invalid vendor order transition from % to %.',
      current_order.order_status,
      resolved_next_status;
  end if;

  if resolved_next_status = 'rejected' then
    -- Aggregate by product because order_items does not enforce uniqueness
    -- on (order_id, product_id).
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
  end if;

  update public.orders o
  set
    order_status = resolved_next_status,
    rejected_at = case
      when resolved_next_status = 'rejected'
        then coalesce(o.rejected_at, now())
      else o.rejected_at
    end
  where o.id = current_order.id
    and o.vendor_id = current_vendor_id;

  perform public.notify_customer_order_status(
    current_order.customer_id,
    current_order.id,
    resolved_next_status::text
  );

  if resolved_next_status = 'ready_for_pickup' then
    perform public.notify_available_drivers_order_ready(current_order.id);
  end if;

  return query
  select o.id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$function$;

-- Preserve the hardened execution boundary for the replaced function.
revoke execute on function public.vendor_update_order_status(uuid, text)
from public, anon;

grant execute on function public.vendor_update_order_status(uuid, text)
to authenticated;

grant execute on function public.vendor_update_order_status(uuid, text)
to service_role;
