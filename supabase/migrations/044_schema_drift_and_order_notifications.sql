drop function if exists public.vendor_respond_prescription_request(uuid, text, text);
alter table public.prescription_quotes
add column if not exists converted_order_id uuid references public.orders(id) on delete set null;

alter table public.prescription_quotes
add column if not exists converted_to_order_at timestamptz;
alter table public.order_items
add column if not exists product_name text;
drop function if exists public.create_cod_order_from_quote(uuid);
drop function if exists public.register_driver_account(text, text, text, text);

alter table public.vendors
add column if not exists delivery_radius_km numeric;

create or replace function public.register_driver_account(
  p_full_name text,
  p_phone text,
  p_vehicle_type text default null,
  p_vehicle_plate text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_profile_id uuid;
  v_driver_id uuid;
begin
  insert into public.profiles (auth_user_id, full_name, phone, role)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_full_name), ''), 'سائق بدون اسم'),
    nullif(regexp_replace(trim(p_phone), '[^0-9+]', '', 'g'), ''),
    'driver'
  )
  on conflict (auth_user_id)
  do update set
    full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
    phone = coalesce(nullif(regexp_replace(trim(p_phone), '[^0-9+]', '', 'g'), ''), public.profiles.phone),
    role = 'driver'
  returning id into v_profile_id;

  insert into public.drivers (user_id, approval_status, is_available)
  values (v_profile_id, 'pending', false)
  on conflict (user_id)
  do update set
    approval_status = case
      when public.drivers.approval_status = 'approved' then public.drivers.approval_status
      else 'pending'::approval_status
    end
  returning id into v_driver_id;

  return v_driver_id;
end;
$$;

alter table public.orders
add column if not exists prescription_quote_id uuid references public.prescription_quotes(id) on delete set null;
alter table public.orders
add column if not exists delivery_distance_km numeric(10,2);

create or replace function public.create_cod_order_from_quote(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_customer_id uuid;
  v_address_id uuid;
  v_order_id uuid;

  v_quote public.prescription_quotes;

  v_vendor_lat numeric;
  v_vendor_lng numeric;

  v_customer_lat numeric;
  v_customer_lng numeric;

  v_delivery_radius_km numeric := 20;
  v_distance_km numeric;

  v_delivery_fee numeric := 0;
  v_total numeric := 0;

  v_libya_now timestamp;
  v_libya_day int;
  v_libya_time time;
  v_is_open boolean := false;

  v_quote_item record;
  v_product record;
begin
  v_customer_id := public.get_customer_id();

  if v_customer_id is null then
    raise exception 'Customer account not found.';
  end if;

  select *
  into v_quote
  from public.prescription_quotes
  where id = p_quote_id
    and customer_id = v_customer_id
    and status = 'accepted';

  if not found then
    raise exception 'Accepted quote not found.';
  end if;

  if v_quote.converted_order_id is not null then
    raise exception 'Quote already converted to order.';
  end if;

  select default_address_id
  into v_address_id
  from public.customers
  where id = v_customer_id;

  if v_address_id is null then
    raise exception 'Customer default address is required.';
  end if;

  v_libya_now := timezone('Africa/Tripoli', now());
  v_libya_day := extract(dow from v_libya_now)::int;
  v_libya_time := v_libya_now::time;

  select exists (
    select 1
    from public.vendor_operating_hours h
    where h.vendor_id = v_quote.vendor_id
      and h.day_of_week = v_libya_day
      and h.is_closed = false
      and h.opens_at is not null
      and h.closes_at is not null
      and v_libya_time >= h.opens_at
      and v_libya_time < h.closes_at
  )
  into v_is_open;

  if v_is_open is not true then
    raise exception 'Pharmacy is currently closed.';
  end if;

select
  lat,
  lng,
  coalesce(delivery_radius_km, 20)
into
  v_vendor_lat,
  v_vendor_lng,
  v_delivery_radius_km
from public.vendors
where id = v_quote.vendor_id;

select
  lat,
  lng
into
  v_customer_lat,
  v_customer_lng
from public.addresses
where id = v_address_id;

  if
    v_vendor_lat is null
    or v_vendor_lng is null
    or v_customer_lat is null
    or v_customer_lng is null
  then
    raise exception 'Delivery coordinates are missing.';
  end if;

  v_distance_km := public.calculate_distance_km(
    v_vendor_lat::double precision,
    v_vendor_lng::double precision,
    v_customer_lat::double precision,
    v_customer_lng::double precision
  );

  if v_distance_km > v_delivery_radius_km then
    raise exception 'Delivery address is outside pharmacy delivery radius.';
  end if;

  v_delivery_fee := public.calculate_delivery_fee(v_distance_km);
  
  for v_quote_item in
    select *
    from public.prescription_quote_items
    where quote_id = v_quote.id
  loop
    if v_quote_item.availability_status = 'unavailable' then
      continue;
    end if;

    if v_quote_item.product_id is null then
      continue;
    end if;

    select id, stock_quantity, is_active
    into v_product
    from public.products
    where id = v_quote_item.product_id;

    if v_product.id is null or v_product.is_active is not true then
      raise exception 'Quoted product is no longer available.';
    end if;

    if v_product.stock_quantity < v_quote_item.quantity then
      raise exception 'Insufficient stock for quoted product.';
    end if;
  end loop;

  v_total := v_quote.subtotal + v_delivery_fee;

  insert into public.orders (
    customer_id,
    vendor_id,
    prescription_quote_id,
    delivery_address_id,
    subtotal,
    delivery_fee,
    delivery_distance_km,
    total,
    payment_method,
    payment_status,
    order_status
  )
  values (
    v_customer_id,
    v_quote.vendor_id,
    v_quote.id,
    v_address_id,
    v_quote.subtotal,
    v_delivery_fee,
    round(v_distance_km, 2),
    v_total,
    'cash_on_delivery',
    'pending',
    'placed'
  )
  returning id into v_order_id;

  for v_quote_item in
    select *
    from public.prescription_quote_items
    where quote_id = v_quote.id
  loop
    if v_quote_item.availability_status = 'unavailable' then
      continue;
    end if;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      total_price
    )
    values (
      v_order_id,
      v_quote_item.product_id,
      v_quote_item.product_name,
      v_quote_item.quantity,
      v_quote_item.unit_price,
      v_quote_item.line_total
    );

    if v_quote_item.product_id is not null then
      update public.products
      set stock_quantity = stock_quantity - v_quote_item.quantity
      where id = v_quote_item.product_id
        and stock_quantity >= v_quote_item.quantity;
    end if;
  end loop;

  update public.prescription_quotes
  set
    converted_to_order_at = now(),
    converted_order_id = v_order_id,
    updated_at = now()
  where id = v_quote.id;

  perform public.enqueue_order_notification(
    'customer',
    v_customer_id,
    v_order_id,
    'تم إنشاء طلبك',
    'تم تحويل عرض السعر المقبول إلى طلب جديد.',
    jsonb_build_object(
      'event', 'customer.order.created_from_quote',
      'orderId', v_order_id,
      'quoteId', v_quote.id,
      'status', 'placed',
      'route', '/orders/[orderId]'
    )
  );

  return v_order_id;
end;
$function$;

grant execute on function public.register_driver_account(text, text, text, text) to authenticated;
grant execute on function public.create_cod_order_from_quote(uuid)
to authenticated;

create or replace function public.notify_customer_order_status(
  p_customer_id uuid,
  p_order_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text := 'تحديث الطلب';
  v_body text;
begin
  v_body := case p_status
    when 'accepted' then 'تم قبول طلبك من الصيدلية.'
    when 'rejected' then 'تم رفض طلبك من الصيدلية.'
    when 'preparing' then 'الصيدلية تجهز طلبك الآن.'
    when 'ready_for_pickup' then 'طلبك جاهز للاستلام من الصيدلية.'
    when 'assigned' then 'تم تعيين سائق لتوصيل طلبك.'
    when 'on_the_way' then 'طلبك في الطريق إليك.'
    when 'delivered' then 'تم تسليم طلبك.'
    when 'cancelled' then 'تم إلغاء طلبك.'
    else 'تم تحديث حالة طلبك.'
  end;

  perform public.enqueue_order_notification(
    'customer',
    p_customer_id,
    p_order_id,
    v_title,
    v_body,
    jsonb_build_object(
      'type', 'order_status',
      'orderId', p_order_id,
      'status', p_status
    )
  );
end;
$$;

create or replace function public.notify_driver_order_assigned(
  p_driver_id uuid,
  p_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.enqueue_order_notification(
    'driver',
    p_driver_id,
    p_order_id,
    'طلب توصيل جديد',
    'تم تعيين طلب جديد لك.',
    jsonb_build_object(
      'type', 'driver_assigned_order',
      'orderId', p_order_id,
      'status', 'assigned'
    )
  );
end;
$$;

create or replace function public.vendor_update_order_status(
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

  return query
  select o.id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$$;

grant execute on function public.vendor_update_order_status(uuid, text) to authenticated;

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
  set order_status = resolved_next_status
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

create or replace function public.admin_assign_driver(
  p_order_id uuid,
  p_driver_id uuid
)
returns table (
  order_id uuid,
  driver_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  current_driver public.drivers%rowtype;
begin
  if not public.is_current_user_admin() then
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

  if current_order.order_status <> 'ready_for_pickup' then
    raise exception 'Only ready-for-pickup orders can be assigned.';
  end if;

  select *
  into current_driver
  from public.drivers d
  where d.id = p_driver_id
  for update;

  if not found then
    raise exception 'Selected driver was not found.';
  end if;

  if current_driver.approval_status <> 'approved' or not current_driver.is_available then
    raise exception 'Selected driver is not currently available for assignment.';
  end if;

  update public.orders o
  set
    driver_id = p_driver_id,
    order_status = 'assigned'
  where o.id = current_order.id;

  update public.drivers d
  set is_available = false
  where d.id = p_driver_id;

  perform public.notify_customer_order_status(
    current_order.customer_id,
    current_order.id,
    'assigned'
  );

  perform public.notify_driver_order_assigned(
    p_driver_id,
    current_order.id
  );

  return query
  select o.id, o.driver_id, o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$$;

grant execute on function public.admin_assign_driver(uuid, uuid) to authenticated;

drop function if exists public.admin_create_category(text);
drop function if exists public.admin_create_category(text, text);

drop function if exists public.admin_update_category(uuid, text);
drop function if exists public.admin_update_category(uuid, text, text);

create or replace function public.admin_create_category(
  p_name text,
  p_name_ar text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_create_category(
    p_name,
    p_name_ar,
    null::text,
    null::text,
    null::text,
    0::integer,
    true::boolean,
    null::uuid
  );
end;
$$;

grant execute on function public.admin_create_category(text, text) to authenticated;

create or replace function public.admin_update_category(
  p_category_id uuid,
  p_name text,
  p_name_ar text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_update_category(
    p_category_id,
    p_name,
    p_name_ar,
    null::text,
    null::text,
    null::text,
    0::integer,
    true::boolean,
    null::uuid
  );
end;
$$;

drop function if exists public.driver_claim_order(uuid);

create or replace function public.driver_claim_order(
  p_order_id uuid
)
returns table (
  order_id uuid,
  driver_id uuid,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_driver_id uuid;
  current_driver public.drivers%rowtype;
  current_order public.orders%rowtype;
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

  if current_driver.approval_status <> 'approved' or not current_driver.is_available then
    raise exception 'Driver is not currently available for assignment.';
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

  return query
  with updated_order as (
    update public.orders o
    set
      driver_id = current_driver_id,
      order_status = 'assigned'
    where o.id = current_order.id
    returning o.id, o.driver_id, o.order_status
  ),
  updated_driver as (
    update public.drivers d
    set is_available = false
    where d.id = current_driver_id
    returning d.id
  ),
  queued_notifications as (
    select
      public.notify_customer_order_status(
        current_order.customer_id,
        current_order.id,
        'assigned'
      ),
      public.notify_driver_order_assigned(
        current_driver_id,
        current_order.id
      )
  )
  select uo.id, uo.driver_id, uo.order_status::text
  from updated_order uo;
end;
$$;

grant execute on function public.driver_claim_order(uuid) to authenticated;
grant execute on function public.admin_update_category(uuid, text, text) to authenticated;