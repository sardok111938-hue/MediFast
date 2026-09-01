-- Allow customers to cancel only their own placed orders.
--
-- Cancellation is intentionally narrow:
--   placed -> cancelled only
--   stock is restored transactionally
--   cancelled_at is stamped
--   the customer is notified
--
-- No customer UPDATE policy is added to orders. Mutation remains RPC-only.

create or replace function public.enforce_order_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_profile_role public.user_role;
  current_customer_id uuid;
  current_vendor_id uuid;
  current_driver_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- SECURITY DEFINER RPC/server-side writes may execute without an end-user
  -- auth context. Those RPCs enforce their own lifecycle contracts.
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

  -- Administrative writes are handled by dedicated admin RPCs.
  if current_profile_role = 'admin' then
    return new;
  end if;

  if new.driver_id is distinct from old.driver_id then
    raise exception 'Only administrators can reassign drivers.';
  end if;

  if current_profile_role = 'customer' then
    current_customer_id := public.get_customer_id();

    if current_customer_id is null
       or current_customer_id <> old.customer_id then
      raise exception 'Customers can update only their own orders.';
    end if;

    if not (
      old.order_status = 'placed'
      and new.order_status = 'cancelled'
    ) then
      raise exception
        'Invalid customer order transition from % to %.',
        old.order_status,
        new.order_status;
    end if;

    return new;
  end if;

  if current_profile_role = 'vendor' then
    current_vendor_id := public.get_vendor_id();

    if current_vendor_id is null
       or current_vendor_id <> old.vendor_id then
      raise exception 'Vendors can update only their own orders.';
    end if;

    if not (
      (
        old.order_status = 'placed'
        and new.order_status in ('accepted', 'rejected')
      )
      or (
        old.order_status = 'accepted'
        and new.order_status = 'preparing'
      )
      or (
        old.order_status = 'preparing'
        and new.order_status = 'ready_for_pickup'
      )
      or old.order_status = new.order_status
    ) then
      raise exception
        'Invalid vendor order transition from % to %.',
        old.order_status,
        new.order_status;
    end if;

    return new;
  end if;

  if current_profile_role = 'driver' then
    current_driver_id := public.get_driver_id();

    if current_driver_id is null
       or current_driver_id <> old.driver_id then
      raise exception 'Drivers can update only their assigned orders.';
    end if;

    if not (
      (
        old.order_status = 'assigned'
        and new.order_status = 'picked_up'
      )
      or (
        old.order_status = 'picked_up'
        and new.order_status = 'on_the_way'
      )
      or (
        old.order_status = 'on_the_way'
        and new.order_status = 'delivered'
      )
      or old.order_status = new.order_status
    ) then
      raise exception
        'Invalid driver order transition from % to %.',
        old.order_status,
        new.order_status;
    end if;

    return new;
  end if;

  raise exception 'This role is not allowed to update orders.';
end;
$function$;

drop trigger if exists enforce_order_lifecycle_update on public.orders;

create trigger enforce_order_lifecycle_update
before update on public.orders
for each row
execute function public.enforce_order_lifecycle_update();


create or replace function public.customer_cancel_order(
  p_order_id uuid
)
returns table(order_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_customer_id uuid;
  current_order public.orders%rowtype;
begin
  current_customer_id := public.get_customer_id();

  if current_customer_id is null then
    raise exception 'Customer account is not linked correctly.';
  end if;

  select *
  into current_order
  from public.orders o
  where o.id = p_order_id
    and o.customer_id = current_customer_id
  for update;

  if not found then
    raise exception 'Order was not found for this customer.';
  end if;

  if current_order.order_status <> 'placed' then
    raise exception
      'Only placed orders can be cancelled by the customer.';
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
  where o.id = current_order.id
    and o.customer_id = current_customer_id;

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

revoke execute on function public.customer_cancel_order(uuid)
from public, anon;

grant execute on function public.customer_cancel_order(uuid)
to authenticated;

grant execute on function public.customer_cancel_order(uuid)
to service_role;
