-- 099_add_vendor_product_barcode_rpcs.sql

CREATE OR REPLACE FUNCTION public.vendor_create_product(
p_category_id uuid DEFAULT NULL::uuid,
p_description text DEFAULT NULL::text,
p_image_url text DEFAULT NULL::text,
p_name text DEFAULT NULL::text,
p_price numeric DEFAULT 0,
p_stock_quantity integer DEFAULT 0,
p_low_stock_threshold integer DEFAULT 5,
p_barcode text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
barcode,
stock_quantity,
low_stock_threshold,
is_active
)
values (
current_vendor_id,
p_category_id,
trim(p_name),
nullif(trim(coalesce(p_description, '')), ''),
p_price,
nullif(trim(coalesce(p_image_url, '')), ''),
nullif(trim(coalesce(p_barcode, '')), ''),
greatest(coalesce(p_stock_quantity, 0), 0),
greatest(coalesce(p_low_stock_threshold, 5), 0),
true
)
returning id into resolved_product_id;

return resolved_product_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.vendor_update_product(
p_product_id uuid,
p_name text DEFAULT NULL::text,
p_description text DEFAULT NULL::text,
p_price numeric DEFAULT NULL::numeric,
p_category_id uuid DEFAULT NULL::uuid,
p_set_category boolean DEFAULT false,
p_image_url text DEFAULT NULL::text,
p_set_image boolean DEFAULT false,
p_stock_quantity integer DEFAULT NULL::integer,
p_low_stock_threshold integer DEFAULT NULL::integer,
p_barcode text DEFAULT NULL::text,
p_set_barcode boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
barcode = case
when p_set_barcode then nullif(trim(coalesce(p_barcode, '')), '')
else barcode
end,
stock_quantity = case
when p_stock_quantity is null then stock_quantity
else greatest(p_stock_quantity, 0)
end,
low_stock_threshold = case
when p_low_stock_threshold is null then low_stock_threshold
else greatest(p_low_stock_threshold, 0)
end
where id = p_product_id
and vendor_id = current_vendor_id
returning id into resolved_product_id;

if resolved_product_id is null then
raise exception 'Product was not found for this vendor.';
end if;

return resolved_product_id;
end;
$function$;
