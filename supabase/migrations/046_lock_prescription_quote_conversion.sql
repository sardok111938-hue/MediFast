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
    and status = 'accepted'
  for update;

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
    where id = v_quote_item.product_id
    for update;

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

grant execute on function public.create_cod_order_from_quote(uuid) to authenticated;
