create or replace function public.notify_available_drivers_order_ready(
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  ready_order public.orders%rowtype;
  driver_record record;
begin
  select *
  into ready_order
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception 'Order was not found.';
  end if;

  if ready_order.order_status <> 'ready_for_pickup' then
    return;
  end if;

  for driver_record in
    select d.id
    from public.drivers d
    where d.approval_status = 'approved'
      and d.is_available = true
  loop
    perform public.enqueue_order_notification(
      'driver',
      driver_record.id,
      ready_order.id,
      'طلب جاهز للاستلام',
      'يوجد طلب جاهز للاستلام من الصيدلية.',
      jsonb_build_object(
        'type', 'driver_available_pickup',
        'orderId', ready_order.id,
        'status', 'ready_for_pickup'
      )
    );
  end loop;
end;
$function$;

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

  update public.orders o
  set order_status = resolved_next_status
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

grant execute on function public.vendor_update_order_status(uuid, text) to authenticated;
