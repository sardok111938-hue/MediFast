drop function if exists public.admin_create_product(uuid, text, text, numeric, uuid, text, integer, boolean);
drop function if exists public.admin_create_product(uuid, text, text, text, numeric, uuid, text, integer, boolean);

create or replace function public.admin_create_product(
  p_vendor_id uuid,
  p_name text,
  p_barcode text default null,
  p_description text default null,
  p_price numeric default 0,
  p_category_id uuid default null,
  p_image_url text default null,
  p_stock_quantity integer default 0,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_product_id uuid;
begin
  if not public.is_current_user_admin() then
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
$$;

grant execute on function public.admin_create_product(uuid, text, text, text, numeric, uuid, text, integer, boolean) to authenticated;

drop function if exists public.admin_update_product(uuid, text, text, numeric, uuid, boolean, text, boolean, integer, boolean);
drop function if exists public.admin_update_product(uuid, text, text, boolean, text, numeric, uuid, boolean, text, boolean, integer, boolean);

create or replace function public.admin_update_product(
  p_product_id uuid,
  p_name text default null,
  p_barcode text default null,
  p_set_barcode boolean default false,
  p_description text default null,
  p_price numeric default null,
  p_category_id uuid default null,
  p_set_category boolean default false,
  p_image_url text default null,
  p_set_image boolean default false,
  p_stock_quantity integer default null,
  p_is_active boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_product_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
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
    barcode = case
      when p_set_barcode then nullif(trim(coalesce(p_barcode, '')), '')
      else barcode
    end,
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
    stock_quantity = coalesce(p_stock_quantity, stock_quantity),
    is_active = coalesce(p_is_active, is_active)
  where id = p_product_id
  returning id into resolved_product_id;

  if resolved_product_id is null then
    raise exception 'Product was not found.';
  end if;

  return resolved_product_id;
end;
$$;

grant execute on function public.admin_update_product(uuid, text, text, boolean, text, numeric, uuid, boolean, text, boolean, integer, boolean) to authenticated;
