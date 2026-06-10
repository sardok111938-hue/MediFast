alter table public.vendors
  add column if not exists completed_orders integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vendors_completed_orders_nonnegative'
      and conrelid = 'public.vendors'::regclass
  ) then
    alter table public.vendors
      add constraint vendors_completed_orders_nonnegative
      check (completed_orders >= 0);
  end if;
end $$;

update public.vendors v
set completed_orders = counts.total
from (
  select
    vendor_id,
    count(*)::integer as total
  from public.orders
  where order_status = 'delivered'
    and vendor_id is not null
  group by vendor_id
) counts
where counts.vendor_id = v.id;

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

  if resolved_next_status = 'delivered'
    and current_order.order_status is distinct from 'delivered'
  then
    update public.drivers d
    set total_deliveries = total_deliveries + 1
    where d.id = current_driver_id;

    update public.vendors v
    set completed_orders = completed_orders + 1
    where v.id = current_order.vendor_id;

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

grant execute on function public.driver_update_order_status(uuid, text) to authenticated;