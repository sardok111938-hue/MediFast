alter table public.drivers
  add column if not exists rating numeric(3, 2) not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists total_deliveries integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drivers_rating_range'
      and conrelid = 'public.drivers'::regclass
  ) then
    alter table public.drivers
      add constraint drivers_rating_range check (rating >= 0 and rating <= 5);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'drivers_rating_count_nonnegative'
      and conrelid = 'public.drivers'::regclass
  ) then
    alter table public.drivers
      add constraint drivers_rating_count_nonnegative check (rating_count >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'drivers_total_deliveries_nonnegative'
      and conrelid = 'public.drivers'::regclass
  ) then
    alter table public.drivers
      add constraint drivers_total_deliveries_nonnegative check (total_deliveries >= 0);
  end if;
end $$;

update public.drivers d
set total_deliveries = counts.total
from (
  select
    driver_id,
    count(*)::integer as total
  from public.orders
  where order_status = 'delivered'
    and driver_id is not null
  group by driver_id
) counts
where counts.driver_id = d.id;

create or replace function public.recalculate_driver_rating(p_driver_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_driver_id is null then
    return;
  end if;

  update public.drivers d
  set
    rating = coalesce(stats.avg_rating, 0),
    rating_count = coalesce(stats.rating_count, 0)
  from (
    select
      round(avg(r.rating)::numeric, 2)::numeric(3, 2) as avg_rating,
      count(*)::integer as rating_count
    from public.reviews r
    where r.driver_id = p_driver_id
  ) stats
  where d.id = p_driver_id;
end;
$function$;

create or replace function public.handle_driver_review_rating_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_driver_rating(old.driver_id);
    return old;
  end if;

  perform public.recalculate_driver_rating(new.driver_id);

  if tg_op = 'UPDATE' and old.driver_id is distinct from new.driver_id then
    perform public.recalculate_driver_rating(old.driver_id);
  end if;

  return new;
end;
$function$;

drop trigger if exists reviews_recalculate_driver_rating on public.reviews;

create trigger reviews_recalculate_driver_rating
after insert or update or delete on public.reviews
for each row
execute function public.handle_driver_review_rating_change();

update public.drivers d
set
  rating = coalesce(stats.avg_rating, 0),
  rating_count = coalesce(stats.rating_count, 0)
from (
  select
    driver_id,
    round(avg(rating)::numeric, 2)::numeric(3, 2) as avg_rating,
    count(*)::integer as rating_count
  from public.reviews
  where driver_id is not null
  group by driver_id
) stats
where stats.driver_id = d.id;

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