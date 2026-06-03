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

  update public.orders o
  set
    order_status = resolved_next_status,
    on_the_way_at = case
      when resolved_next_status = 'on_the_way' and o.on_the_way_at is null then now()
      else o.on_the_way_at
    end,
    delivered_at = case
      when resolved_next_status = 'delivered' and o.delivered_at is null then now()
      else o.delivered_at
    end
  where o.id = current_order.id;

  update public.drivers d
  set is_available = case
    when resolved_next_status = 'delivered' then true
    else d.is_available
  end
  where d.id = current_driver_id;

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
$$;

grant execute on function public.driver_update_order_status(uuid, text) to authenticated;
