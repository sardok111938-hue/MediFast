create or replace function public.create_cod_order(cart_items_input jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_customer_id uuid;
  current_address_id uuid;
  resolved_vendor_id uuid;
  subtotal_amount numeric(10, 2);
  delivery_fee_amount numeric(10, 2) := 4.00;
  created_order_id uuid;
  requested_count integer;
  resolved_count integer;
  distinct_vendor_count integer;
  stock_error text;
begin
  current_customer_id := public.get_customer_id();

  if current_customer_id is null then
    raise exception 'Customer account is not linked correctly.';
  end if;

  if cart_items_input is null
     or jsonb_typeof(cart_items_input) <> 'array'
     or jsonb_array_length(cart_items_input) = 0 then
    raise exception 'Cart is empty.';
  end if;

  select c.default_address_id
  into current_address_id
  from public.customers c
  where c.id = current_customer_id;

  if current_address_id is null then
    raise exception 'A delivery address is required before checkout.';
  end if;

  create temporary table tmp_cod_requested_items (
    product_id uuid primary key,
    quantity integer not null check (quantity > 0)
  ) on commit drop;

  insert into tmp_cod_requested_items (product_id, quantity)
  select
    product_id,
    sum(quantity)::integer as quantity
  from (
    select
      nullif(item->>'product_id', '')::uuid as product_id,
      greatest(coalesce((item->>'quantity')::integer, 0), 0) as quantity
    from jsonb_array_elements(cart_items_input) as item
  ) parsed
  where product_id is not null
    and quantity > 0
  group by product_id;

  select count(*)
  into requested_count
  from tmp_cod_requested_items;

  if coalesce(requested_count, 0) = 0 then
    raise exception 'Cart is empty.';
  end if;

  /*
    Lock all requested product rows for the duration of this transaction.
    This prevents two concurrent checkouts from both seeing the same stock.
  */
  perform 1
  from public.products p
  join tmp_cod_requested_items r on r.product_id = p.id
  order by p.id
  for update of p;

  select
    count(*),
    count(distinct p.vendor_id),
    min(p.vendor_id),
    coalesce(sum(p.price * r.quantity), 0)
  into
    resolved_count,
    distinct_vendor_count,
    resolved_vendor_id,
    subtotal_amount
  from tmp_cod_requested_items r
  join public.products p on p.id = r.product_id
  where p.is_active = true;

  if resolved_count is distinct from requested_count then
    raise exception 'One or more cart products are missing or inactive.';
  end if;

  if distinct_vendor_count is null or distinct_vendor_count = 0 then
    raise exception 'Cart is empty.';
  end if;

  if distinct_vendor_count > 1 then
    raise exception 'Cart contains products from multiple vendors.';
  end if;

  select p.name
  into stock_error
  from tmp_cod_requested_items r
  join public.products p on p.id = r.product_id
  where p.stock_quantity < r.quantity
  order by p.name
  limit 1;

  if stock_error is not null then
    raise exception 'Insufficient stock for product: %', stock_error;
  end if;

  insert into public.orders (
    customer_id,
    vendor_id,
    subtotal,
    delivery_fee,
    total,
    payment_method,
    payment_status,
    order_status,
    delivery_address_id
  )
  values (
    current_customer_id,
    resolved_vendor_id,
    subtotal_amount,
    delivery_fee_amount,
    subtotal_amount + delivery_fee_amount,
    'cash_on_delivery',
    'pending',
    'placed',
    current_address_id
  )
  returning id into created_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    total_price
  )
  select
    created_order_id,
    p.id,
    p.name,
    r.quantity,
    p.price,
    p.price * r.quantity
  from tmp_cod_requested_items r
  join public.products p on p.id = r.product_id;

  update public.products p
  set stock_quantity = p.stock_quantity - r.quantity
  from tmp_cod_requested_items r
  where p.id = r.product_id
    and p.stock_quantity >= r.quantity;

  if not found then
    raise exception 'Insufficient stock. Please refresh your cart.';
  end if;

  return created_order_id;
end;
$$;

grant execute on function public.create_cod_order(jsonb) to authenticated;