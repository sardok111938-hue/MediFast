drop function if exists public.calculate_distance_km(double precision, double precision, double precision, double precision);

create or replace function public.calculate_distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $function$
  select 6371 * acos(
    least(
      1,
      greatest(
        -1,
        cos(radians(lat1)) *
        cos(radians(lat2)) *
        cos(radians(lng2) - radians(lng1)) +
        sin(radians(lat1)) *
        sin(radians(lat2))
      )
    )
  );
$function$;


drop function if exists public.register_driver_account(text, text, text, text);

create or replace function public.register_driver_account(
  p_full_name text,
  p_phone text,
  p_vehicle_type text,
  p_vehicle_plate text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile_id uuid;
  v_driver_id uuid;
begin
  insert into public.profiles (
    auth_user_id,
    full_name,
    phone,
    role
  )
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

  insert into public.drivers (
    user_id,
    vehicle_type,
    vehicle_plate,
    approval_status,
    is_available
  )
  values (
    v_profile_id,
    nullif(trim(p_vehicle_type), ''),
    nullif(trim(p_vehicle_plate), ''),
    'pending',
    false
  )
  on conflict (user_id)
  do update set
    vehicle_type = coalesce(nullif(trim(p_vehicle_type), ''), public.drivers.vehicle_type),
    vehicle_plate = coalesce(nullif(trim(p_vehicle_plate), ''), public.drivers.vehicle_plate),
    approval_status = case
      when public.drivers.approval_status = 'approved' then public.drivers.approval_status
      else 'pending'::approval_status
    end
  returning id into v_driver_id;

  return v_driver_id;
end;
$function$;


drop function if exists public.admin_update_global_product_category(uuid, uuid);

create or replace function public.admin_update_global_product_category(
  p_product_id uuid,
  p_category_id uuid
)
returns table(barcode text, updated_products_count integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_barcode text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select nullif(trim(p.barcode), '')
  into target_barcode
  from public.products p
  where p.id = p_product_id;

  if target_barcode is null then
    raise exception 'Product has no barcode to sync.';
  end if;

  if not exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and c.is_active = true
  ) then
    raise exception 'Category not found or inactive.';
  end if;

  update public.products p
  set category_id = p_category_id
  where nullif(trim(p.barcode), '') = target_barcode;

  get diagnostics updated_products_count = row_count;

  barcode := target_barcode;

  return next;
end;
$function$;


drop function if exists public.create_cod_order_from_quote(uuid);

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

  v_delivery_fee :=
    case
      when v_distance_km <= 3 then 3
      when v_distance_km <= 8 then 5
      when v_distance_km <= 15 then 8
      when v_distance_km <= 20 then 12
      else 12
    end;

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

grant execute on function public.calculate_distance_km(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.register_driver_account(text, text, text, text) to authenticated;
grant execute on function public.admin_update_global_product_category(uuid, uuid) to authenticated;
grant execute on function public.create_cod_order_from_quote(uuid) to authenticated;
