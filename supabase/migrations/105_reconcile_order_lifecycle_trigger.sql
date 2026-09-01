-- Reconcile the orders lifecycle trigger with the current driver workflow.
--
-- Current authoritative driver lifecycle:
-- assigned -> picked_up -> on_the_way -> delivered
--
-- Earlier trigger definitions still allowed:
-- assigned -> on_the_way -> delivered
--
-- Keep this migration narrowly scoped to lifecycle-trigger reconciliation.

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
$$;

drop trigger if exists enforce_order_lifecycle_update
on public.orders;

create trigger enforce_order_lifecycle_update
before update on public.orders
for each row
execute function public.enforce_order_lifecycle_update();
