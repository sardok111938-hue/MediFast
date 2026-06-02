grant update on table public.addresses to authenticated;

create or replace view "public"."products_with_global_images" as
select
  p.id,
  p.vendor_id,
  p.category_id,
  p.name,
  p.description,
  p.price,
  p.image_url,
  p.barcode,
  p.stock_quantity,
  p.is_active,
  p.created_at,
  p.low_stock_threshold,
  coalesce(p.image_url, gp.image_url) as display_image_url,
  gp.image_url as global_image_url
from public.products p
left join public.global_products gp on gp.barcode = p.barcode;

create or replace view "public"."vendor_grouped_products" as
select
  p.vendor_id,
  p.category_id,
  c.name as category_name,
  c.name_ar as category_name_ar,
  jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'name_ar', null,
      'price', p.price,
      'stock', p.stock_quantity,
      'is_active', p.is_active,
      'image_url', coalesce(p.image_url, gp.image_url),
      'barcode', p.barcode
    )
    order by p.name
  ) as products
from public.products p
left join public.categories c on p.category_id = c.id
left join public.global_products gp on gp.barcode = p.barcode
where p.is_active = true
group by p.vendor_id, p.category_id, c.name, c.name_ar;
