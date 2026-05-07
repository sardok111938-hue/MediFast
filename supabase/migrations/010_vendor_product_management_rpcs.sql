create or replace function public.vendor_create_product(
  p_name text,
  p_description text default null,
  p_price numeric default 0,
  p_category_id uuid default null,
  p_image_url text default null,
  p_stock_quantity integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  resolved_product_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Product name is required.';
  end if;

  if coalesce(p_price, 0) <= 0 then
    raise exception 'Product price must be greater than zero.';
  end if;

  insert into public.products (
    vendor_id,
    category_id,
    name,
    description,
    price,
    image_url,
    stock_quantity,
    is_active
  )
  values (
    current_vendor_id,
    p_category_id,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    p_price,
    nullif(trim(coalesce(p_image_url, '')), ''),
    greatest(coalesce(p_stock_quantity, 0), 0),
    true
  )
  returning id into resolved_product_id;

  return resolved_product_id;
end;
$$;

grant execute on function public.vendor_create_product(text, text, numeric, uuid, text, integer) to authenticated;

create or replace function public.vendor_update_product(
  p_product_id uuid,
  p_name text default null,
  p_description text default null,
  p_price numeric default null,
  p_category_id uuid default null,
  p_set_category boolean default false,
  p_image_url text default null,
  p_set_image boolean default false,
  p_stock_quantity integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  resolved_product_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  if p_product_id is null then
    raise exception 'Product is required.';
  end if;

  if p_name is not null and nullif(trim(p_name), '') is null then
    raise exception 'Product name cannot be empty.';
  end if;

  if p_price is not null and p_price <= 0 then
    raise exception 'Product price must be greater than zero.';
  end if;

  update public.products
  set
    name = coalesce(nullif(trim(coalesce(p_name, '')), ''), name),
    description = case
      when p_description is null then description
      else nullif(trim(coalesce(p_description, '')), '')
    end,
    price = coalesce(p_price, price),
    category_id = case
      when p_set_category then p_category_id
      else category_id
    end,
    image_url = case
      when p_set_image then nullif(trim(coalesce(p_image_url, '')), '')
      else image_url
    end,
    stock_quantity = coalesce(p_stock_quantity, stock_quantity)
  where id = p_product_id
    and vendor_id = current_vendor_id
  returning id into resolved_product_id;

  if resolved_product_id is null then
    raise exception 'Product was not found for this vendor.';
  end if;

  return resolved_product_id;
end;
$$;

grant execute on function public.vendor_update_product(uuid, text, text, numeric, uuid, boolean, text, boolean, integer) to authenticated;

create or replace function public.vendor_deactivate_product(
  p_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  resolved_product_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  if p_product_id is null then
    raise exception 'Product is required.';
  end if;

  update public.products
  set is_active = false
  where id = p_product_id
    and vendor_id = current_vendor_id
  returning id into resolved_product_id;

  if resolved_product_id is null then
    raise exception 'Product was not found for this vendor.';
  end if;

  return resolved_product_id;
end;
$$;

grant execute on function public.vendor_deactivate_product(uuid) to authenticated;
