alter table public.notifications enable row level security;

drop policy if exists "Drivers can read own notifications"
on public.notifications;

create policy "Drivers can read own notifications"
on public.notifications
for select
to authenticated
using (
  recipient_role = 'driver'
  and recipient_id = public.get_driver_id()
);

create or replace function public.driver_claim_order(p_order_id uuid)
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
    (array_agg(o.vendor_id order by o.created_at asc))[1],
    count(distinct o.vendor_id)::integer
  into active_order_count, active_vendor_id, active_vendor_count
  from public.orders o
  where o.driver_id = current_driver_id
    and o.order_status in ('assigned', 'picked_up', 'on_the_way');

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

  update public.orders o
  set
    driver_id = current_driver_id,
    order_status = 'assigned',
    assigned_at = coalesce(o.assigned_at, now())
  where o.id = current_order.id;

  update public.drivers d
  set is_available = (active_order_count + 1) < 2
  where d.id = current_driver_id;

  perform public.notify_customer_order_status(
    current_order.customer_id,
    current_order.id,
    'assigned'
  );

  perform public.notify_driver_order_assigned(
    current_driver_id,
    current_order.id
  );

  return query
  select o.id, o.driver_id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$function$;

grant execute on function public.driver_claim_order(uuid) to authenticated;
