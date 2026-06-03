drop trigger if exists "enforce_order_lifecycle_update" on "public"."orders";

drop view if exists "public"."products_with_global_images";

drop view if exists "public"."vendor_grouped_products";

create or replace view "public"."products_with_global_images" as  SELECT p.id,
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
    COALESCE(p.image_url, gp.image_url) AS display_image_url,
    gp.image_url AS global_image_url
   FROM (public.products p
     LEFT JOIN public.global_products gp ON ((gp.barcode = p.barcode)));


create or replace view "public"."vendor_grouped_products" as  SELECT p.vendor_id,
    p.category_id,
    c.name AS category_name,
    c.name_ar AS category_name_ar,
    jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'name_ar', NULL::unknown, 'price', p.price, 'stock', p.stock_quantity, 'is_active', p.is_active, 'image_url', COALESCE(p.image_url, gp.image_url), 'barcode', p.barcode) ORDER BY p.name) AS products
   FROM ((public.products p
     LEFT JOIN public.categories c ON ((p.category_id = c.id)))
     LEFT JOIN public.global_products gp ON ((gp.barcode = p.barcode)))
  WHERE (p.is_active = true)
  GROUP BY p.vendor_id, p.category_id, c.name, c.name_ar;




