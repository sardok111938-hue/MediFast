create or replace function public.apply_order_status_timestamp(
  p_next_status text,
  p_accepted_at timestamptz,
  p_assigned_at timestamptz,
  p_arrived_at_pharmacy_at timestamptz,
  p_picked_up_at timestamptz,
  p_on_the_way_at timestamptz,
  p_delivered_at timestamptz,
  p_cancelled_at timestamptz,
  p_rejected_at timestamptz
)
returns table (
  accepted_at timestamptz,
  assigned_at timestamptz,
  arrived_at_pharmacy_at timestamptz,
  picked_up_at timestamptz,
  on_the_way_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  rejected_at timestamptz
)
language plpgsql
stable
as $$
begin
  return query
  select
    case when p_next_status = 'accepted' and p_accepted_at is null then now() else p_accepted_at end,
    case when p_next_status = 'assigned' and p_assigned_at is null then now() else p_assigned_at end,
    case when p_next_status = 'arrived_at_pharmacy' and p_arrived_at_pharmacy_at is null then now() else p_arrived_at_pharmacy_at end,
    case when p_next_status = 'picked_up' and p_picked_up_at is null then now() else p_picked_up_at end,
    case when p_next_status = 'on_the_way' and p_on_the_way_at is null then now() else p_on_the_way_at end,
    case when p_next_status = 'delivered' and p_delivered_at is null then now() else p_delivered_at end,
    case when p_next_status = 'cancelled' and p_cancelled_at is null then now() else p_cancelled_at end,
    case when p_next_status = 'rejected' and p_rejected_at is null then now() else p_rejected_at end;
end;
$$;

create or replace function public.auto_assign_driver_to_order(
  p_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
begin
  select d.id
  into v_driver_id
  from public.drivers d
  where d.approval_status = 'approved'
    and d.is_available = true
  order by d.created_at asc
  limit 1
  for update skip locked;

  if v_driver_id is null then
    return null;
  end if;

  update public.drivers
  set is_available = false
  where id = v_driver_id;

  update public.orders
  set
    driver_id = v_driver_id,
    order_status = 'assigned'
  where id = p_order_id
    and order_status = 'ready_for_pickup'
    and driver_id is null;

  if not found then
    update public.drivers
    set is_available = true
    where id = v_driver_id;

    return null;
  end if;

  return v_driver_id;
end;
$$;

create or replace function public.cancel_prescription_request(
  p_request_id uuid
)
returns public.prescription_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.prescription_requests;
begin
  update public.prescription_requests
  set status = 'cancelled'
  where id = p_request_id
    and customer_id = public.get_customer_id()
    and status = 'pending'
  returning *
  into v_request;

  if v_request.id is null then
    raise exception 'Prescription request not found or cannot be cancelled.';
  end if;

  return v_request;
end;
$$;

create or replace function public.queue_notification(
  p_recipient_role text,
  p_recipient_id uuid,
  p_order_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_id uuid;
begin
  insert into public.notifications (
    recipient_role,
    recipient_id,
    order_id,
    title,
    body,
    data
  )
  values (
    p_recipient_role,
    p_recipient_id,
    p_order_id,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb)
  )
  returning id into notification_id;

  return notification_id;
end;
$$;

create or replace function public.set_prescription_quotes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_prescription_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  if new.status in ('accepted', 'rejected')
     and old.status = 'pending' then
    new.responded_at = now();
  end if;

  return new;
end;
$$;