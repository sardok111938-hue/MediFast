-- Reconcile admin authorization state.
--
-- 1. Restore the hardened public.is_admin() definition observed in production.
-- 2. Replace stale public.is_current_user_admin() references in admin RPCs.
--
-- Preserve existing RPC signatures and behavior.

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $function$
begin
  return exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
end;
$function$;


create or replace function public.admin_assign_driver(
  p_order_id uuid,
  p_driver_id uuid
)
returns table(order_id uuid, driver_id uuid, order_status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_order public.orders%rowtype;
  current_driver public.drivers%rowtype;
  active_order_count integer;
  active_vendor_id uuid;
  active_vendor_count integer;
begin
  if not public.is_admin() then
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

  if current_order.driver_id is not null then
    raise exception 'Order is already assigned to a driver.';
  end if;

  select *
  into current_driver
  from public.drivers d
  where d.id = p_driver_id
  for update;

  if not found then
    raise exception 'Selected driver was not found.';
  end if;

  if current_driver.approval_status <> 'approved' then
    raise exception 'Selected driver is not approved.';
  end if;

  select
    count(*)::integer,
    (array_agg(o.vendor_id order by o.created_at asc))[1],
    count(distinct o.vendor_id)::integer
  into
    active_order_count,
    active_vendor_id,
    active_vendor_count
  from public.orders o
  where o.driver_id = p_driver_id
    and o.order_status in (
      'assigned',
      'picked_up',
      'on_the_way'
    );

  if active_vendor_count > 1 then
    raise exception
      'Driver has active orders from multiple pharmacies and cannot receive another batch order.';
  end if;

  if active_order_count >= 2 then
    raise exception 'Driver already has the maximum active orders.';
  end if;

  if active_order_count > 0
     and active_vendor_id <> current_order.vendor_id then
    raise exception
      'Driver can only batch active orders from the same pharmacy.';
  end if;

  if active_order_count = 0
     and not current_driver.is_available then
    raise exception
      'Selected driver is not currently available for assignment.';
  end if;

  update public.orders o
  set
    driver_id = p_driver_id,
    order_status = 'assigned',
    assigned_at = case
      when o.assigned_at is null then now()
      else o.assigned_at
    end
  where o.id = current_order.id;

  update public.drivers d
  set is_available = (active_order_count + 1) < 2
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
  select
    o.id,
    o.driver_id,
    o.order_status::text
  from public.orders o
  where o.id = current_order.id;
end;
$function$;


create or replace function public.admin_create_category(
  p_name text,
  p_name_ar text default null::text,
  p_slug text default null::text,
  p_icon text default null::text,
  p_image_url text default null::text,
  p_sort_order integer default 0,
  p_is_active boolean default true,
  p_parent_id uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  resolved_category_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  insert into public.categories (
    name,
    name_ar,
    slug,
    icon,
    image_url,
    sort_order,
    is_active,
    parent_id
  )
  values (
    trim(p_name),
    nullif(trim(coalesce(p_name_ar, '')), ''),
    nullif(trim(coalesce(p_slug, '')), ''),
    nullif(trim(coalesce(p_icon, '')), ''),
    nullif(trim(coalesce(p_image_url, '')), ''),
    coalesce(p_sort_order, 0),
    coalesce(p_is_active, true),
    p_parent_id
  )
  returning id into resolved_category_id;

  return resolved_category_id;
end;
$function$;


create or replace function public.admin_update_category(
  p_category_id uuid,
  p_name text,
  p_name_ar text default null::text,
  p_slug text default null::text,
  p_icon text default null::text,
  p_image_url text default null::text,
  p_sort_order integer default 0,
  p_is_active boolean default true,
  p_parent_id uuid default null::uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  resolved_category_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_category_id is null then
    raise exception 'Category is required.';
  end if;

  if p_parent_id = p_category_id then
    raise exception 'A category cannot be its own parent.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  update public.categories
  set
    name = trim(p_name),
    name_ar = nullif(trim(coalesce(p_name_ar, '')), ''),
    slug = nullif(trim(coalesce(p_slug, '')), ''),
    icon = nullif(trim(coalesce(p_icon, '')), ''),
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    sort_order = coalesce(p_sort_order, 0),
    is_active = coalesce(p_is_active, true),
    parent_id = p_parent_id
  where id = p_category_id
  returning id into resolved_category_id;

  if resolved_category_id is null then
    raise exception 'Category was not found.';
  end if;

  return resolved_category_id;
end;
$function$;


create or replace function public.admin_create_product(
  p_vendor_id uuid,
  p_name text,
  p_barcode text default null::text,
  p_description text default null::text,
  p_price numeric default 0,
  p_category_id uuid default null::uuid,
  p_image_url text default null::text,
  p_stock_quantity integer default 0,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  resolved_product_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_vendor_id is null then
    raise exception 'Vendor is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Product name is required.';
  end if;

  if coalesce(p_price, 0) <= 0 then
    raise exception 'Product price must be greater than zero.';
  end if;

  if not exists (
    select 1
    from public.vendors v
    where v.id = p_vendor_id
  ) then
    raise exception 'Vendor was not found.';
  end if;

  insert into public.products (
    vendor_id,
    category_id,
    name,
    description,
    price,
    image_url,
    barcode,
    stock_quantity,
    is_active
  )
  values (
    p_vendor_id,
    p_category_id,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    p_price,
    nullif(trim(coalesce(p_image_url, '')), ''),
    nullif(trim(coalesce(p_barcode, '')), ''),
    greatest(coalesce(p_stock_quantity, 0), 0),
    coalesce(p_is_active, true)
  )
  returning id into resolved_product_id;

  return resolved_product_id;
end;
$function$;


create or replace function public.admin_update_product(
  p_product_id uuid,
  p_name text default null::text,
  p_barcode text default null::text,
  p_set_barcode boolean default false,
  p_description text default null::text,
  p_price numeric default null::numeric,
  p_category_id uuid default null::uuid,
  p_set_category boolean default false,
  p_image_url text default null::text,
  p_set_image boolean default false,
  p_stock_quantity integer default null::integer,
  p_is_active boolean default null::boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  resolved_product_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_product_id is null then
    raise exception 'Product is required.';
  end if;

  if p_name is not null
     and nullif(trim(p_name), '') is null then
    raise exception 'Product name cannot be empty.';
  end if;

  if p_price is not null
     and p_price <= 0 then
    raise exception 'Product price must be greater than zero.';
  end if;

  update public.products
  set
    name = coalesce(
      nullif(trim(coalesce(p_name, '')), ''),
      name
    ),
    barcode = case
      when p_set_barcode then
        nullif(trim(coalesce(p_barcode, '')), '')
      else barcode
    end,
    description = case
      when p_description is null then
        description
      else nullif(trim(coalesce(p_description, '')), '')
    end,
    price = coalesce(p_price, price),
    category_id = case
      when p_set_category then p_category_id
      else category_id
    end,
    image_url = case
      when p_set_image then
        nullif(trim(coalesce(p_image_url, '')), '')
      else image_url
    end,
    stock_quantity = coalesce(
      p_stock_quantity,
      stock_quantity
    ),
    is_active = coalesce(
      p_is_active,
      is_active
    )
  where id = p_product_id
  returning id into resolved_product_id;

  if resolved_product_id is null then
    raise exception 'Product was not found.';
  end if;

  return resolved_product_id;
end;
$function$;
