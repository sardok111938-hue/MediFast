


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."approval_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."approval_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'placed',
    'accepted',
    'rejected',
    'ready_for_pickup',
    'assigned',
    'arrived_at_pharmacy',
    'picked_up',
    'on_the_way',
    'delivered',
    'preparing',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_method" AS ENUM (
    'cash_on_delivery'
);


ALTER TYPE "public"."payment_method" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'collected'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'driver',
    'vendor',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_assign_driver"("p_order_id" "uuid", "p_driver_id" "uuid") RETURNS TABLE("order_id" "uuid", "driver_id" "uuid", "order_status" "public"."order_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_customer_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if not exists (
    select 1
    from public.drivers d
    where d.id = p_driver_id
      and d.approval_status = 'approved'
      and d.is_available = true
  ) then
    raise exception 'Driver is not approved or available.';
  end if;

  update public.drivers d
  set is_available = false
  where d.id = p_driver_id;

  return query
  update public.orders o
  set
    driver_id = p_driver_id,
    order_status = 'assigned'::order_status,
    assigned_at = case
      when o.assigned_at is null then now()
      else o.assigned_at
    end
  where o.id = p_order_id
    and o.order_status = 'ready_for_pickup'::order_status
    and o.driver_id is null
  returning o.id, o.driver_id, o.order_status;

  if not found then
    update public.drivers d
    set is_available = true
    where d.id = p_driver_id;

    raise exception 'This order is no longer ready for driver assignment.';
  end if;

  select o.customer_id
  into target_customer_id
  from public.orders o
  where o.id = p_order_id;

  if target_customer_id is not null then
    perform public.queue_notification(
      'customer',
      target_customer_id,
      p_order_id,
      'تم تعيين السائق',
      'تم تعيين سائق لاستلام طلبك.',
      jsonb_build_object(
        'type', 'order_status_changed',
        'orderId', p_order_id,
        'status', 'assigned'
      )
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."admin_assign_driver"("p_order_id" "uuid", "p_driver_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_category"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return public.admin_create_category(p_name, null);
end;
$$;


ALTER FUNCTION "public"."admin_create_category"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  resolved_category_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  insert into public.categories (name, name_ar)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_name_ar, '')), '')
  )
  returning id into resolved_category_id;

  return resolved_category_id;
end;
$$;


ALTER FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_icon" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT true, "p_parent_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.categories (
    name, name_ar, slug, icon, image_url, sort_order, is_active, parent_id
  )
  values (
    p_name, p_name_ar, p_slug, p_icon, p_image_url, p_sort_order, p_is_active, p_parent_id
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_product"("p_vendor_id" "uuid", "p_name" "text", "p_barcode" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_price" numeric DEFAULT 0, "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_image_url" "text" DEFAULT NULL::"text", "p_stock_quantity" integer DEFAULT 0, "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  resolved_product_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
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


ALTER FUNCTION "public"."admin_create_product"("p_vendor_id" "uuid", "p_name" "text", "p_barcode" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_image_url" "text", "p_stock_quantity" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_vendor"("p_profile_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_license_number" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_address_line_1" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_area" "text" DEFAULT NULL::"text", "p_lat" numeric DEFAULT NULL::numeric, "p_lng" numeric DEFAULT NULL::numeric, "p_delivery_radius_km" numeric DEFAULT 20, "p_approval_status" "text" DEFAULT 'approved'::"text", "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  created_vendor_id uuid;
  resolved_slug text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Vendor name is required.';
  end if;

  resolved_slug := lower(
    regexp_replace(
      trim(coalesce(p_slug, p_name)),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )
  );

  resolved_slug := trim(both '-' from resolved_slug);

  if nullif(resolved_slug, '') is null then
    resolved_slug := 'vendor-' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  end if;

  insert into public.vendors (
    user_id,
    name,
    slug,
    description,
    image_url,
    license_number,
    contact_email,
    phone,
    address_line_1,
    city,
    area,
    lat,
    lng,
    delivery_radius_km,
    approval_status,
    is_active
  )
  values (
    p_profile_id,
    trim(p_name),
    resolved_slug,
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_image_url, '')), ''),
    nullif(trim(coalesce(p_license_number, '')), ''),
    nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_address_line_1, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_area, '')), ''),
    p_lat,
    p_lng,
    coalesce(p_delivery_radius_km, 20),
    coalesce(p_approval_status, 'approved')::public.approval_status,
    coalesce(p_is_active, true)
  )
  returning id into created_vendor_id;

  return created_vendor_id;
end;
$$;


ALTER FUNCTION "public"."admin_create_vendor"("p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_approval_status" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_deactivate_product"("p_product_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.products
  set is_active = false
  where id = p_product_id;
end;
$$;


ALTER FUNCTION "public"."admin_deactivate_product"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_delete_category"("p_category_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.categories
  where id = p_category_id;
end;
$$;


ALTER FUNCTION "public"."admin_delete_category"("p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_vendors"() RETURNS TABLE("vendor_id" "uuid", "profile_id" "uuid", "auth_user_id" "uuid", "email" "text", "contact_email" "text", "profile_full_name" "text", "profile_role" "text", "vendor_name" "text", "slug" "text", "description" "text", "image_url" "text", "license_number" "text", "phone" "text", "address_line_1" "text", "city" "text", "area" "text", "lat" numeric, "lng" numeric, "delivery_radius_km" numeric, "approval_status" "text", "is_active" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    v.id,
    v.user_id,
    p.auth_user_id,
    au.email,
    v.contact_email,
    p.full_name,
    p.role::text,
    v.name,
    v.slug,
    v.description,
    v.image_url,
    v.license_number,
    v.phone,
    v.address_line_1,
    v.city,
    v.area,
    v.lat,
    v.lng,
    v.delivery_radius_km,
    v.approval_status::text,
    v.is_active
  from public.vendors v
  left join public.profiles p on p.id = v.user_id
  left join auth.users au on au.id = p.auth_user_id
  order by v.created_at desc;
$$;


ALTER FUNCTION "public"."admin_list_vendors"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return public.admin_update_category(p_category_id, p_name, null);
end;
$$;


ALTER FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  resolved_category_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_category_id is null then
    raise exception 'Category is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  update public.categories
  set
    name = trim(p_name),
    name_ar = nullif(trim(coalesce(p_name_ar, '')), '')
  where id = p_category_id
  returning id into resolved_category_id;

  if resolved_category_id is null then
    raise exception 'Category was not found.';
  end if;

  return resolved_category_id;
end;
$$;


ALTER FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_icon" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT true, "p_parent_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.categories
  set
    name = p_name,
    name_ar = p_name_ar,
    slug = p_slug,
    icon = p_icon,
    image_url = p_image_url,
    sort_order = p_sort_order,
    is_active = p_is_active,
    parent_id = p_parent_id
  where id = p_category_id;
end;
$$;


ALTER FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_driver"("p_driver_id" "uuid", "p_approval_status" "text" DEFAULT NULL::"text", "p_is_available" boolean DEFAULT NULL::boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.drivers
  set
    approval_status = coalesce(p_approval_status::approval_status, approval_status),
    is_available = coalesce(p_is_available, is_available)
  where id = p_driver_id;
end;
$$;


ALTER FUNCTION "public"."admin_update_driver"("p_driver_id" "uuid", "p_approval_status" "text", "p_is_available" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_global_product_category"("p_product_id" "uuid", "p_category_id" "uuid") RETURNS TABLE("barcode" "text", "updated_products_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."admin_update_global_product_category"("p_product_id" "uuid", "p_category_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_next_status" "text") RETURNS TABLE("order_id" "uuid", "order_status" "public"."order_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_next_status not in (
    'accepted',
    'preparing',
    'rejected',
    'ready_for_pickup',
    'cancelled'
  ) then
    raise exception 'Invalid admin order status.';
  end if;

  return query
  update public.orders o
  set
    order_status = p_next_status::order_status,

    accepted_at = case
      when p_next_status = 'accepted'
        and o.accepted_at is null
      then now()
      else o.accepted_at
    end,

    rejected_at = case
      when p_next_status = 'rejected'
        and o.rejected_at is null
      then now()
      else o.rejected_at
    end,

    cancelled_at = case
      when p_next_status = 'cancelled'
        and o.cancelled_at is null
      then now()
      else o.cancelled_at
    end

  where o.id = p_order_id
    and (
      (o.order_status = 'placed'::order_status and p_next_status in ('accepted', 'rejected', 'cancelled'))
      or
      (o.order_status = 'accepted'::order_status and p_next_status in ('preparing', 'cancelled'))
      or
      (o.order_status = 'preparing'::order_status and p_next_status in ('ready_for_pickup', 'cancelled'))
      or
      (o.order_status = 'ready_for_pickup'::order_status and p_next_status = 'cancelled')
      or
      (o.order_status = 'assigned'::order_status and p_next_status = 'cancelled')
      or
      (o.order_status = 'on_the_way'::order_status and p_next_status = 'cancelled')
    )
  returning o.id, o.order_status;

  if not found then
    raise exception 'Invalid admin order transition.';
  end if;

  if p_next_status = 'cancelled' then
    update public.drivers d
    set is_available = true
    from public.orders o
    where o.id = p_order_id
      and o.driver_id = d.id;
  end if;
end;
$$;


ALTER FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_next_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_price" numeric DEFAULT NULL::numeric, "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_set_category" boolean DEFAULT false, "p_image_url" "text" DEFAULT NULL::"text", "p_set_image" boolean DEFAULT false, "p_barcode" "text" DEFAULT NULL::"text", "p_set_barcode" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.products
  set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    price = coalesce(p_price, price),
    category_id = case when p_set_category then p_category_id else category_id end,
    image_url = case when p_set_image then p_image_url else image_url end,
    barcode = case when p_set_barcode then nullif(trim(p_barcode), '') else barcode end
  where id = p_product_id;
end;
$$;


ALTER FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_barcode" "text", "p_set_barcode" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_vendor"("p_vendor_id" "uuid", "p_profile_id" "uuid" DEFAULT NULL::"uuid", "p_name" "text" DEFAULT NULL::"text", "p_slug" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_license_number" "text" DEFAULT NULL::"text", "p_contact_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_address_line_1" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_area" "text" DEFAULT NULL::"text", "p_lat" numeric DEFAULT NULL::numeric, "p_lng" numeric DEFAULT NULL::numeric, "p_delivery_radius_km" numeric DEFAULT NULL::numeric, "p_set_lat" boolean DEFAULT false, "p_set_lng" boolean DEFAULT false, "p_approval_status" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.vendors
  set
    user_id = coalesce(p_profile_id, user_id),
    name = coalesce(nullif(trim(p_name), ''), name),
    slug = coalesce(nullif(trim(p_slug), ''), slug),
    description = nullif(trim(coalesce(p_description, '')), ''),
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    license_number = nullif(trim(coalesce(p_license_number, '')), ''),
    contact_email = nullif(trim(coalesce(p_contact_email, '')), ''),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    address_line_1 = coalesce(nullif(trim(p_address_line_1), ''), address_line_1),
    city = coalesce(nullif(trim(p_city), ''), city),
    area = coalesce(nullif(trim(p_area), ''), area),
    lat = case when p_set_lat then p_lat else lat end,
    lng = case when p_set_lng then p_lng else lng end,
    delivery_radius_km = coalesce(p_delivery_radius_km, delivery_radius_km),
    approval_status = coalesce(
      p_approval_status::public.approval_status,
      approval_status
    ),
    is_active = coalesce(p_is_active, is_active)
  where id = p_vendor_id;

  return p_vendor_id;
end;
$$;


ALTER FUNCTION "public"."admin_update_vendor"("p_vendor_id" "uuid", "p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_set_lat" boolean, "p_set_lng" boolean, "p_approval_status" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_order_status_timestamp"("p_next_status" "text", "p_accepted_at" timestamp with time zone, "p_assigned_at" timestamp with time zone, "p_arrived_at_pharmacy_at" timestamp with time zone, "p_picked_up_at" timestamp with time zone, "p_on_the_way_at" timestamp with time zone, "p_delivered_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_rejected_at" timestamp with time zone) RETURNS TABLE("accepted_at" timestamp with time zone, "assigned_at" timestamp with time zone, "arrived_at_pharmacy_at" timestamp with time zone, "picked_up_at" timestamp with time zone, "on_the_way_at" timestamp with time zone, "delivered_at" timestamp with time zone, "cancelled_at" timestamp with time zone, "rejected_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $$
begin
  return query
  select
    case
      when p_next_status = 'accepted' and p_accepted_at is null
        then now()
      else p_accepted_at
    end,
    case
      when p_next_status = 'assigned' and p_assigned_at is null
        then now()
      else p_assigned_at
    end,
    case
      when p_next_status = 'arrived_at_pharmacy' and p_arrived_at_pharmacy_at is null
        then now()
      else p_arrived_at_pharmacy_at
    end,
    case
      when p_next_status = 'picked_up' and p_picked_up_at is null
        then now()
      else p_picked_up_at
    end,
    case
      when p_next_status = 'on_the_way' and p_on_the_way_at is null
        then now()
      else p_on_the_way_at
    end,
    case
      when p_next_status = 'delivered' and p_delivered_at is null
        then now()
      else p_delivered_at
    end,
    case
      when p_next_status = 'cancelled' and p_cancelled_at is null
        then now()
      else p_cancelled_at
    end,
    case
      when p_next_status = 'rejected' and p_rejected_at is null
        then now()
      else p_rejected_at
    end;
end;
$$;


ALTER FUNCTION "public"."apply_order_status_timestamp"("p_next_status" "text", "p_accepted_at" timestamp with time zone, "p_assigned_at" timestamp with time zone, "p_arrived_at_pharmacy_at" timestamp with time zone, "p_picked_up_at" timestamp with time zone, "p_on_the_way_at" timestamp with time zone, "p_delivered_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_rejected_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_driver_to_order"("p_order_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_driver_id uuid;
begin
  select d.id
  into v_driver_id
  from public.drivers d
  where d.approval_status = 'approved'
    and d.is_available = true
  order by d.created_at asc
  limit 1
  for update skip locked;

  if v_driver_id is null then
    return null;
  end if;

  update public.drivers
  set is_available = false
  where id = v_driver_id;

  update public.orders
  set
    driver_id = v_driver_id,
    order_status = 'assigned'
  where id = p_order_id
    and order_status = 'ready_for_pickup'
    and driver_id is null;

  if not found then
    update public.drivers
    set is_available = true
    where id = v_driver_id;

    return null;
  end if;

  return v_driver_id;
end;
$$;


ALTER FUNCTION "public"."auto_assign_driver_to_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_distance_km"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) RETURNS double precision
    LANGUAGE "sql" IMMUTABLE
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_distance_km"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."prescription_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "address_id" "uuid" NOT NULL,
    "image_path" "text" NOT NULL,
    "note" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    "vendor_note" "text",
    CONSTRAINT "prescription_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."prescription_requests" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_prescription_request"("p_request_id" "uuid") RETURNS "public"."prescription_requests"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request public.prescription_requests;
begin
  update public.prescription_requests
  set status = 'cancelled'
  where id = p_request_id
    and customer_id = public.get_customer_id()
    and status = 'pending'
  returning *
  into v_request;

  if v_request.id is null then
    raise exception 'Prescription request not found or cannot be cancelled.';
  end if;

  return v_request;
end;
$$;


ALTER FUNCTION "public"."cancel_prescription_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_role" "text" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "dedupe_key" "text",
    CONSTRAINT "notifications_attempt_count_check" CHECK (("attempt_count" >= 0)),
    CONSTRAINT "notifications_recipient_role_check" CHECK (("recipient_role" = ANY (ARRAY['customer'::"text", 'driver'::"text"]))),
    CONSTRAINT "notifications_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_queued_notifications"("p_limit" integer DEFAULT 20) RETURNS SETOF "public"."notifications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.notifications
  set
    status = 'queued',
    error_message = coalesce(error_message, 'Recovered stale processing notification.')
  where status = 'processing'
    and attempt_count < 3
    and last_attempt_at < now() - interval '10 minutes';

  update public.notifications
  set
    status = 'failed',
    error_message = coalesce(error_message, 'Notification processing timed out after maximum attempts.')
  where status = 'processing'
    and attempt_count >= 3
    and last_attempt_at < now() - interval '10 minutes';

  return query
  update public.notifications n
  set
    status = 'processing',
    attempt_count = n.attempt_count + 1,
    last_attempt_at = now(),
    error_message = null
  where n.id in (
    select q.id
    from public.notifications q
    where q.status = 'queued'
      and q.attempt_count < 3
    order by q.created_at asc
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  returning n.*;
end;
$$;


ALTER FUNCTION "public"."claim_queued_notifications"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_cod_order"("cart_items_input" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_customer_id uuid;
  v_address_id uuid;
  v_order_id uuid;
  v_vendor_id uuid;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric := 0;
  v_item jsonb;
  v_product record;
  v_quantity int;

  v_libya_now timestamp;
  v_libya_day int;
  v_libya_time time;
  v_is_open boolean := false;

  v_vendor_lat numeric;
  v_vendor_lng numeric;
  v_customer_lat numeric;
  v_customer_lng numeric;
  v_delivery_radius_km numeric := 20;
  v_distance_km numeric;
begin
  v_customer_id := public.get_customer_id();

  if v_customer_id is null then
    raise exception 'Customer account not found.';
  end if;

  select default_address_id
  into v_address_id
  from public.customers
  where id = v_customer_id;

  if v_address_id is null then
    raise exception 'Customer default address is required.';
  end if;

  for v_item in select value from jsonb_array_elements(cart_items_input)
  loop
    v_quantity := (v_item->>'quantity')::int;

    if v_quantity <= 0 then
      raise exception 'Invalid product quantity.';
    end if;

    select id, vendor_id, price, stock_quantity, is_active
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if v_product.id is null or v_product.is_active is not true then
      raise exception 'Product is not available.';
    end if;

    if v_product.stock_quantity < v_quantity then
      raise exception 'Insufficient stock for product.';
    end if;

    if v_vendor_id is null then
      v_vendor_id := v_product.vendor_id;
    elsif v_vendor_id <> v_product.vendor_id then
      raise exception 'All products must belong to the same vendor.';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  v_libya_now := timezone('Africa/Tripoli', now());
  v_libya_day := extract(dow from v_libya_now)::int;
  v_libya_time := v_libya_now::time;

  select exists (
    select 1
    from public.vendor_operating_hours h
    where h.vendor_id = v_vendor_id
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
  where id = v_vendor_id;

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

  v_total := v_subtotal + v_delivery_fee;

  insert into public.orders (
    customer_id,
    vendor_id,
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
    v_vendor_id,
    v_address_id,
    v_subtotal,
    v_delivery_fee,
    round(v_distance_km, 2),
    v_total,
    'cash_on_delivery',
    'pending',
    'placed'
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(cart_items_input)
  loop
    v_quantity := (v_item->>'quantity')::int;

    select id, name, price
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

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
      v_product.id,
      v_product.name,
      v_quantity,
      v_product.price,
      v_product.price * v_quantity
    );

    update public.products
    set stock_quantity = stock_quantity - v_quantity
    where id = v_product.id
      and stock_quantity >= v_quantity;
  end loop;

  perform public.enqueue_order_notification(
    'customer',
    v_customer_id,
    v_order_id,
    'تم استلام طلبك',
    'تم إنشاء طلبك بنجاح وسنرسل لك تحديثات الحالة.',
    jsonb_build_object(
      'event', 'customer.order.placed',
      'orderId', v_order_id,
      'status', 'placed',
      'route', '/orders/[orderId]'
    )
  );

  return v_order_id;
end;
$$;


ALTER FUNCTION "public"."create_cod_order"("cart_items_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_cod_order_from_quote"("p_quote_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_cod_order_from_quote"("p_quote_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prescription_request_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "vendor_note" "text",
    "customer_note" "text",
    "subtotal" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "converted_to_order_at" timestamp with time zone,
    "converted_order_id" "uuid",
    CONSTRAINT "prescription_quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "prescription_quotes_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);


ALTER TABLE "public"."prescription_quotes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."customer_respond_prescription_quote"("p_quote_id" "uuid", "p_response" "text", "p_customer_note" "text" DEFAULT NULL::"text") RETURNS "public"."prescription_quotes"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_customer_id uuid;
  v_quote public.prescription_quotes;
begin
  v_customer_id := public.get_customer_id();

  if v_customer_id is null then
    raise exception 'Customer not found.';
  end if;

  if p_response not in ('accepted', 'rejected') then
    raise exception 'Invalid quote response.';
  end if;

  update public.prescription_quotes
  set
    status = p_response,
    customer_note = nullif(trim(coalesce(p_customer_note, '')), ''),
    accepted_at = case when p_response = 'accepted' then now() else accepted_at end,
    updated_at = now()
  where id = p_quote_id
    and customer_id = v_customer_id
    and status = 'sent'
  returning * into v_quote;

  if not found then
    raise exception 'Sent quote not found for this customer.';
  end if;

  return v_quote;
end;
$$;


ALTER FUNCTION "public"."customer_respond_prescription_quote"("p_quote_id" "uuid", "p_response" "text", "p_customer_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."driver_claim_order"("p_order_id" "uuid") RETURNS TABLE("order_id" "uuid", "driver_id" "uuid", "order_status" "public"."order_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_driver_id uuid;
  target_customer_id uuid;
begin
  current_driver_id := public.get_driver_id();

  if current_driver_id is null then
    raise exception 'Driver not found or not approved.';
  end if;

  if not exists (
    select 1
    from public.drivers d
    where d.id = current_driver_id
      and d.approval_status = 'approved'
      and d.is_available = true
  ) then
    raise exception 'Driver is not available.';
  end if;

  update public.orders o
  set
    driver_id = current_driver_id,
    order_status = 'assigned'::order_status,
    assigned_at = case
      when o.assigned_at is null
      then now()
      else o.assigned_at
    end
  where o.id = p_order_id
    and o.order_status = 'ready_for_pickup'::order_status
    and o.driver_id is null
  returning o.id, o.driver_id, o.order_status
  into order_id, driver_id, order_status;

  if not found then
    raise exception 'Order is no longer available.';
  end if;

  update public.drivers d
  set is_available = false
  where d.id = current_driver_id;

  select o.customer_id
  into target_customer_id
  from public.orders o
  where o.id = p_order_id;

  if target_customer_id is not null then
    perform public.queue_notification(
      'customer',
      target_customer_id,
      p_order_id,
      'تم تعيين السائق',
      'تم تعيين سائق لاستلام طلبك.',
      jsonb_build_object(
        'type', 'order_status_changed',
        'orderId', p_order_id,
        'status', 'assigned'
      )
    );
  end if;

  return next;
end;
$$;


ALTER FUNCTION "public"."driver_claim_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."driver_update_order_status"("p_order_id" "uuid", "p_next_status" "text") RETURNS TABLE("order_id" "uuid", "order_status" "public"."order_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_driver_id uuid;
  target_customer_id uuid;
begin
  current_driver_id := public.get_driver_id();

  if current_driver_id is null then
    raise exception 'Driver not found.';
  end if;

  if p_next_status not in ('on_the_way', 'delivered') then
    raise exception 'Invalid driver order status.';
  end if;

  return query
  update public.orders o
  set
    order_status = p_next_status::order_status,

    on_the_way_at = case
      when p_next_status = 'on_the_way'
        and o.on_the_way_at is null
      then now()
      else o.on_the_way_at
    end,

    delivered_at = case
      when p_next_status = 'delivered'
        and o.delivered_at is null
      then now()
      else o.delivered_at
    end

  where o.id = p_order_id
    and o.driver_id = current_driver_id
    and (
      (o.order_status = 'assigned'::order_status and p_next_status = 'on_the_way')
      or
      (o.order_status = 'on_the_way'::order_status and p_next_status = 'delivered')
    )
  returning o.id, o.order_status;

  if not found then
    raise exception 'Invalid driver order transition.';
  end if;

  select o.customer_id
  into target_customer_id
  from public.orders o
  where o.id = p_order_id;

  if target_customer_id is not null then
    perform public.queue_notification(
      'customer',
      target_customer_id,
      p_order_id,
      case
        when p_next_status = 'on_the_way' then 'طلبك في الطريق'
        when p_next_status = 'delivered' then 'تم توصيل طلبك'
        else 'تحديث على طلبك'
      end,
      case
        when p_next_status = 'on_the_way' then 'طلبك في الطريق إليك الآن.'
        when p_next_status = 'delivered' then 'تم توصيل طلبك بنجاح.'
        else 'تم تحديث حالة طلبك.'
      end,
      jsonb_build_object(
        'type', 'order_status_changed',
        'orderId', p_order_id,
        'status', p_next_status
      )
    );
  end if;

  if p_next_status = 'delivered' then
    update public.drivers
    set is_available = true
    where id = current_driver_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."driver_update_order_status"("p_order_id" "uuid", "p_next_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_order_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  normalized_role text;
  normalized_title text;
  normalized_body text;
  normalized_data jsonb;
  notification_id uuid;
  notification_dedupe_key text;
begin
  normalized_role := trim(coalesce(p_recipient_role, ''));
  normalized_title := trim(coalesce(p_title, ''));
  normalized_body := trim(coalesce(p_body, ''));
  normalized_data := coalesce(p_data, '{}'::jsonb);

  if normalized_role not in ('customer', 'driver') then
    raise exception 'Unsupported notification recipient role: %.', normalized_role;
  end if;

  if p_recipient_id is null then
    raise exception 'Notification recipient id is required.';
  end if;

  if normalized_title = '' or normalized_body = '' then
    raise exception 'Notification title and body are required.';
  end if;

  notification_dedupe_key := md5(concat_ws(
    '|',
    normalized_role,
    p_recipient_id::text,
    coalesce(p_order_id::text, ''),
    coalesce(normalized_data->>'event', normalized_title)
  ));

  with inserted as (
    insert into public.notifications (
      recipient_role,
      recipient_id,
      order_id,
      title,
      body,
      data,
      dedupe_key
    )
    values (
      normalized_role,
      p_recipient_id,
      p_order_id,
      normalized_title,
      normalized_body,
      normalized_data,
      notification_dedupe_key
    )
    on conflict do nothing
    returning id
  ), selected_notification as (
    select id
    from inserted
    union all
    select n.id
    from public.notifications n
    where n.dedupe_key = notification_dedupe_key
    limit 1
  )
  select id
  into notification_id
  from selected_notification;

  return notification_id;
end;
$$;


ALTER FUNCTION "public"."enqueue_order_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_customer_account"("p_full_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
begin
  insert into public.profiles (
    auth_user_id,
    full_name,
    phone,
    role
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(p_full_name), ''), 'عميل بدون اسم'),
    nullif(trim(p_phone), ''),
    'customer'
  )
  on conflict (auth_user_id)
  do update set
    full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
    phone = coalesce(nullif(trim(p_phone), ''), public.profiles.phone),
    role = 'customer'
  returning id into v_profile_id;

  insert into public.customers (user_id)
  values (v_profile_id)
  on conflict (user_id)
  do update set user_id = excluded.user_id
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;


ALTER FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select c.id
  from public.customers c
  join public.profiles p
    on p.id = c.user_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_customer_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_driver_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select d.id
  from public.drivers d
  join public.profiles p on p.id = d.user_id
  where p.auth_user_id = auth.uid()
    and d.approval_status = 'approved'
  order by d.created_at asc, d.id asc
  limit 1;
$$;


ALTER FUNCTION "public"."get_driver_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_vendor_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select v.id
  from public.vendors v
  join public.profiles p on p.id = v.user_id
  where p.auth_user_id = auth.uid()
    and v.approval_status = 'approved'
    and v.is_active = true
  order by v.created_at asc, v.id asc
  limit 1;
$$;


ALTER FUNCTION "public"."get_vendor_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from profiles
    where auth_user_id = auth.uid()
    and role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."queue_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  notification_id uuid;
begin
  insert into public.notifications (
    recipient_role,
    recipient_id,
    order_id,
    title,
    body,
    data
  )
  values (
    p_recipient_role,
    p_recipient_id,
    p_order_id,
    p_title,
    p_body,
    coalesce(p_data, '{}'::jsonb)
  )
  returning id into notification_id;

  return notification_id;
end;
$$;


ALTER FUNCTION "public"."queue_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_prescription_quote_subtotal"("p_quote_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.prescription_quotes q
  set subtotal = coalesce((
    select sum(i.line_total)
    from public.prescription_quote_items i
    where i.quote_id = p_quote_id
      and i.availability_status in ('available', 'substitute')
  ), 0)
  where q.id = p_quote_id;
end;
$$;


ALTER FUNCTION "public"."recalculate_prescription_quote_subtotal"("p_quote_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_driver_account"("p_full_name" "text", "p_phone" "text", "p_vehicle_type" "text", "p_vehicle_plate" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."register_driver_account"("p_full_name" "text", "p_phone" "text", "p_vehicle_type" "text", "p_vehicle_plate" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text" DEFAULT NULL::"text", "p_address_line_1" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_area" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_auth_user_id uuid := auth.uid();
  resolved_profile_id uuid;
  resolved_vendor_id uuid;
  resolved_slug text;
begin
  if current_auth_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'Full name is required.';
  end if;

  if nullif(trim(coalesce(p_vendor_name, '')), '') is null then
    raise exception 'Vendor name is required.';
  end if;

  resolved_slug := lower(regexp_replace(trim(coalesce(p_slug, p_vendor_name)), '[^a-zA-Z0-9]+', '-', 'g'));
  resolved_slug := trim(both '-' from resolved_slug);

  if nullif(resolved_slug, '') is null then
    resolved_slug := 'vendor-' || replace(current_auth_user_id::text, '-', '');
  end if;

  insert into public.profiles (auth_user_id, full_name, phone, role)
  values (
    current_auth_user_id,
    trim(p_full_name),
    nullif(trim(coalesce(p_phone, '')), ''),
    'vendor'
  )
  on conflict (auth_user_id)
  do update set
    full_name = excluded.full_name,
    phone = coalesce(excluded.phone, public.profiles.phone),
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else 'vendor'::public.user_role
    end
  returning id into resolved_profile_id;

  if exists (
    select 1
    from public.profiles p
    where p.id = resolved_profile_id
      and p.role = 'admin'
  ) then
    raise exception 'Admin accounts cannot self-register as vendors.';
  end if;

  if exists (
    select 1
    from public.vendors v
    where v.slug = resolved_slug
      and v.user_id is distinct from resolved_profile_id
  ) then
    resolved_slug := resolved_slug || '-' || left(replace(current_auth_user_id::text, '-', ''), 8);
  end if;

  select v.id
  into resolved_vendor_id
  from public.vendors v
  where v.user_id = resolved_profile_id
  limit 1;

  if resolved_vendor_id is not null then
    update public.vendors
    set
      name = trim(p_vendor_name),
      slug = coalesce(nullif(resolved_slug, ''), public.vendors.slug),
      description = nullif(trim(coalesce(p_description, '')), ''),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      address_line_1 = nullif(trim(coalesce(p_address_line_1, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      area = nullif(trim(coalesce(p_area, '')), ''),
      approval_status = case
        when public.vendors.approval_status = 'approved' then public.vendors.approval_status
        else 'pending'::public.approval_status
      end,
      is_active = case
        when public.vendors.approval_status = 'approved' then public.vendors.is_active
        else false
      end
    where public.vendors.id = resolved_vendor_id;

    return resolved_vendor_id;
  end if;

  insert into public.vendors (
    user_id,
    name,
    slug,
    description,
    phone,
    address_line_1,
    city,
    area,
    approval_status,
    is_active
  )
  values (
    resolved_profile_id,
    trim(p_vendor_name),
    resolved_slug,
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_address_line_1, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_area, '')), ''),
    'pending',
    false
  )
  returning id into resolved_vendor_id;

  return resolved_vendor_id;
end;
$$;


ALTER FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text" DEFAULT NULL::"text", "p_address_line_1" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_area" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_license_number" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_auth_user_id uuid := auth.uid();
  resolved_profile_id uuid;
  resolved_vendor_id uuid;
  resolved_slug text;
begin
  if current_auth_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if nullif(trim(coalesce(p_full_name, '')), '') is null then
    raise exception 'Full name is required.';
  end if;

  if nullif(trim(coalesce(p_vendor_name, '')), '') is null then
    raise exception 'Vendor name is required.';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is null then
    raise exception 'Phone is required.';
  end if;

  if nullif(trim(coalesce(p_address_line_1, '')), '') is null then
    raise exception 'Address is required.';
  end if;

  if nullif(trim(coalesce(p_city, '')), '') is null then
    raise exception 'City is required.';
  end if;

  if nullif(trim(coalesce(p_area, '')), '') is null then
    raise exception 'Area is required.';
  end if;

  resolved_slug := lower(regexp_replace(trim(coalesce(p_slug, p_vendor_name)), '[^a-zA-Z0-9]+', '-', 'g'));
  resolved_slug := trim(both '-' from resolved_slug);

  if nullif(resolved_slug, '') is null then
    resolved_slug := 'vendor-' || replace(current_auth_user_id::text, '-', '');
  end if;

  insert into public.profiles (auth_user_id, full_name, phone, role)
  values (
    current_auth_user_id,
    trim(p_full_name),
    trim(p_phone),
    'vendor'
  )
  on conflict (auth_user_id)
  do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = case
      when public.profiles.role = 'admin' then public.profiles.role
      else 'vendor'::public.user_role
    end
  returning id into resolved_profile_id;

  if exists (
    select 1
    from public.profiles p
    where p.id = resolved_profile_id
      and p.role = 'admin'
  ) then
    raise exception 'Admin accounts cannot self-register as vendors.';
  end if;

  if exists (
    select 1
    from public.vendors v
    where v.slug = resolved_slug
      and v.user_id is distinct from resolved_profile_id
  ) then
    resolved_slug := resolved_slug || '-' || left(replace(current_auth_user_id::text, '-', ''), 8);
  end if;

  select v.id
  into resolved_vendor_id
  from public.vendors v
  where v.user_id = resolved_profile_id
  limit 1;

  if resolved_vendor_id is not null then
    update public.vendors
    set
      name = trim(p_vendor_name),
      slug = coalesce(nullif(resolved_slug, ''), public.vendors.slug),
      description = nullif(trim(coalesce(p_description, '')), ''),
      image_url = nullif(trim(coalesce(p_image_url, '')), ''),
      license_number = nullif(trim(coalesce(p_license_number, '')), ''),
      phone = trim(p_phone),
      address_line_1 = trim(p_address_line_1),
      city = trim(p_city),
      area = trim(p_area),
      approval_status = case
        when public.vendors.approval_status = 'approved' then public.vendors.approval_status
        else 'pending'::public.approval_status
      end,
      is_active = case
        when public.vendors.approval_status = 'approved' then public.vendors.is_active
        else false
      end
    where public.vendors.id = resolved_vendor_id;

    return resolved_vendor_id;
  end if;

  insert into public.vendors (
    user_id,
    name,
    slug,
    description,
    image_url,
    license_number,
    phone,
    address_line_1,
    city,
    area,
    approval_status,
    is_active
  )
  values (
    resolved_profile_id,
    trim(p_vendor_name),
    resolved_slug,
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_image_url, '')), ''),
    nullif(trim(coalesce(p_license_number, '')), ''),
    trim(p_phone),
    trim(p_address_line_1),
    trim(p_city),
    trim(p_area),
    'pending',
    false
  )
  returning id into resolved_vendor_id;

  return resolved_vendor_id;
end;
$$;


ALTER FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_prescription_quotes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_prescription_quotes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_prescription_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();

  if new.status in ('accepted', 'rejected') and old.status = 'pending' then
    new.responded_at = now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_prescription_requests_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_activate_product"("p_product_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  set is_active = true
  where id = p_product_id
    and vendor_id = current_vendor_id
  returning id into resolved_product_id;

  if resolved_product_id is null then
    raise exception 'Product was not found for this vendor.';
  end if;

  return resolved_product_id;
end;
$$;


ALTER FUNCTION "public"."vendor_activate_product"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_create_prescription_quote"("p_prescription_request_id" "uuid") RETURNS "public"."prescription_quotes"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_vendor_id uuid;
  v_request record;
  v_quote public.prescription_quotes;
begin
  v_vendor_id := public.get_vendor_id();

  if v_vendor_id is null then
    raise exception 'Vendor not found.';
  end if;

  select pr.*
  into v_request
  from public.prescription_requests pr
  where pr.id = p_prescription_request_id
    and pr.vendor_id = v_vendor_id
    and pr.status = 'accepted';

  if not found then
    raise exception 'Accepted prescription request not found for this vendor.';
  end if;

  select *
  into v_quote
  from public.prescription_quotes
  where prescription_request_id = p_prescription_request_id
    and vendor_id = v_vendor_id
    and status = 'draft'
  limit 1;

  if found then
    return v_quote;
  end if;

  insert into public.prescription_quotes (
    prescription_request_id,
    vendor_id,
    customer_id,
    status
  )
  values (
    p_prescription_request_id,
    v_vendor_id,
    v_request.customer_id,
    'draft'
  )
  returning * into v_quote;

  return v_quote;
end;
$$;


ALTER FUNCTION "public"."vendor_create_prescription_quote"("p_prescription_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_create_product"("p_category_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_name" "text" DEFAULT NULL::"text", "p_price" numeric DEFAULT 0, "p_stock_quantity" integer DEFAULT 0, "p_low_stock_threshold" integer DEFAULT 5) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    greatest(coalesce(p_stock_quantity, 0), 0),
    greatest(coalesce(p_low_stock_threshold, 5), 0),
    true
  )
  returning id into resolved_product_id;

  return resolved_product_id;
end;
$$;


ALTER FUNCTION "public"."vendor_create_product"("p_category_id" "uuid", "p_description" "text", "p_image_url" "text", "p_name" "text", "p_price" numeric, "p_stock_quantity" integer, "p_low_stock_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_deactivate_product"("p_product_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."vendor_deactivate_product"("p_product_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_delete_prescription_quote_item"("p_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_vendor_id uuid;
  v_quote_id uuid;
begin
  v_vendor_id := public.get_vendor_id();

  if v_vendor_id is null then
    raise exception 'Vendor not found.';
  end if;

  select i.quote_id
  into v_quote_id
  from public.prescription_quote_items i
  join public.prescription_quotes q on q.id = i.quote_id
  where i.id = p_item_id
    and q.vendor_id = v_vendor_id
    and q.status = 'draft';

  if not found then
    raise exception 'Draft quote item not found for this vendor.';
  end if;

  delete from public.prescription_quote_items
  where id = p_item_id;

  perform public.recalculate_prescription_quote_subtotal(v_quote_id);
end;
$$;


ALTER FUNCTION "public"."vendor_delete_prescription_quote_item"("p_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_respond_prescription_request"("p_request_id" "uuid", "p_status" "text") RETURNS "public"."prescription_requests"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_request public.prescription_requests;
begin
  if p_status not in ('accepted', 'rejected') then
    raise exception 'Invalid prescription request status.';
  end if;

  update public.prescription_requests
  set status = p_status
  where id = p_request_id
    and vendor_id = public.get_vendor_id()
    and status = 'pending'
  returning *
  into v_request;

  if v_request.id is null then
    raise exception 'Prescription request not found or already handled.';
  end if;

  return v_request;
end;
$$;


ALTER FUNCTION "public"."vendor_respond_prescription_request"("p_request_id" "uuid", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_send_prescription_quote"("p_quote_id" "uuid", "p_vendor_note" "text" DEFAULT NULL::"text") RETURNS "public"."prescription_quotes"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_vendor_id uuid;
  v_quote public.prescription_quotes;
  v_items_count integer;
begin
  v_vendor_id := public.get_vendor_id();

  if v_vendor_id is null then
    raise exception 'Vendor not found.';
  end if;

  select *
  into v_quote
  from public.prescription_quotes
  where id = p_quote_id
    and vendor_id = v_vendor_id
    and status = 'draft';

  if not found then
    raise exception 'Draft quote not found for this vendor.';
  end if;

  select count(*)
  into v_items_count
  from public.prescription_quote_items
  where quote_id = p_quote_id;

  if v_items_count = 0 then
    raise exception 'Cannot send an empty quote.';
  end if;

  perform public.recalculate_prescription_quote_subtotal(p_quote_id);

  update public.prescription_quotes
  set
    status = 'sent',
    vendor_note = nullif(trim(coalesce(p_vendor_note, vendor_note, '')), ''),
    updated_at = now()
  where id = p_quote_id
    and vendor_id = v_vendor_id
    and status = 'draft'
  returning * into v_quote;

  return v_quote;
end;
$$;


ALTER FUNCTION "public"."vendor_send_prescription_quote"("p_quote_id" "uuid", "p_vendor_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_update_order_status"("p_order_id" "uuid", "p_next_status" "text") RETURNS TABLE("order_id" "uuid", "order_status" "public"."order_status")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_vendor_id uuid;
  target_customer_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor not found or not approved.';
  end if;

  if p_next_status not in (
    'accepted',
    'preparing',
    'rejected',
    'ready_for_pickup'
  ) then
    raise exception 'Invalid vendor order status.';
  end if;

  return query
  update public.orders o
  set
    order_status = p_next_status::order_status,

    accepted_at = case
      when p_next_status = 'accepted'
        and o.accepted_at is null
      then now()
      else o.accepted_at
    end,

    rejected_at = case
      when p_next_status = 'rejected'
        and o.rejected_at is null
      then now()
      else o.rejected_at
    end

  where o.id = p_order_id
    and o.vendor_id = current_vendor_id
    and (
      (o.order_status = 'placed'::order_status and p_next_status in ('accepted', 'rejected'))
      or
      (o.order_status = 'accepted'::order_status and p_next_status = 'preparing')
      or
      (o.order_status = 'preparing'::order_status and p_next_status = 'ready_for_pickup')
    )
  returning o.id, o.order_status;

  if not found then
    raise exception 'Invalid vendor order transition.';
  end if;

  select o.customer_id
  into target_customer_id
  from public.orders o
  where o.id = p_order_id;

  if target_customer_id is not null then
    perform public.queue_notification(
      'customer',
      target_customer_id,
      p_order_id,
      'تحديث على طلبك',
      case
        when p_next_status = 'accepted' then 'تم قبول طلبك من الصيدلية.'
        when p_next_status = 'preparing' then 'الصيدلية تقوم بتحضير طلبك الآن.'
        when p_next_status = 'ready_for_pickup' then 'طلبك جاهز للاستلام وفي انتظار السائق.'
        when p_next_status = 'rejected' then 'تم رفض طلبك من الصيدلية.'
        else 'تم تحديث حالة طلبك.'
      end,
      jsonb_build_object(
        'type', 'order_status_changed',
        'orderId', p_order_id,
        'status', p_next_status
      )
    );
  end if;
end;
$$;


ALTER FUNCTION "public"."vendor_update_order_status"("p_order_id" "uuid", "p_next_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_update_prescription_note"("p_request_id" "uuid", "p_vendor_note" "text") RETURNS "public"."prescription_requests"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_row public.prescription_requests;
begin
  update public.prescription_requests
  set
    vendor_note = nullif(trim(p_vendor_note), ''),
    updated_at = now()
  where id = p_request_id
    and vendor_id = public.get_vendor_id()
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Prescription request not found.';
  end if;

  return v_row;
end;
$$;


ALTER FUNCTION "public"."vendor_update_prescription_note"("p_request_id" "uuid", "p_vendor_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_update_product"("p_product_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_price" numeric DEFAULT NULL::numeric, "p_category_id" "uuid" DEFAULT NULL::"uuid", "p_set_category" boolean DEFAULT false, "p_image_url" "text" DEFAULT NULL::"text", "p_set_image" boolean DEFAULT false, "p_stock_quantity" integer DEFAULT NULL::integer, "p_low_stock_threshold" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."vendor_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_stock_quantity" integer, "p_low_stock_threshold" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_update_settings"("p_name" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_address_line_1" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_area" "text" DEFAULT NULL::"text", "p_image_url" "text" DEFAULT NULL::"text", "p_lat" numeric DEFAULT NULL::numeric, "p_lng" numeric DEFAULT NULL::numeric, "p_delivery_radius_km" numeric DEFAULT NULL::numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_vendor_id uuid;
begin
  v_vendor_id := public.get_vendor_id();

  if v_vendor_id is null then
    raise exception 'Vendor not found or not approved';
  end if;

  update public.vendors
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    address_line_1 = nullif(trim(coalesce(p_address_line_1, '')), ''),
    city = nullif(trim(coalesce(p_city, '')), ''),
    area = nullif(trim(coalesce(p_area, '')), ''),
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    lat = p_lat,
    lng = p_lng,
    delivery_radius_km = coalesce(p_delivery_radius_km, delivery_radius_km)
  where id = v_vendor_id;
end;
$$;


ALTER FUNCTION "public"."vendor_update_settings"("p_name" "text", "p_description" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_image_url" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prescription_quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quote_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "product_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric DEFAULT 0 NOT NULL,
    "line_total" numeric DEFAULT 0 NOT NULL,
    "availability_status" "text" DEFAULT 'available'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "prescription_quote_items_availability_status_check" CHECK (("availability_status" = ANY (ARRAY['available'::"text", 'unavailable'::"text", 'substitute'::"text"]))),
    CONSTRAINT "prescription_quote_items_line_total_check" CHECK (("line_total" >= (0)::numeric)),
    CONSTRAINT "prescription_quote_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "prescription_quote_items_unit_price_check" CHECK (("unit_price" >= (0)::numeric))
);


ALTER TABLE "public"."prescription_quote_items" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."vendor_upsert_prescription_quote_item"("p_quote_id" "uuid", "p_item_id" "uuid" DEFAULT NULL::"uuid", "p_product_id" "uuid" DEFAULT NULL::"uuid", "p_product_name" "text" DEFAULT NULL::"text", "p_quantity" integer DEFAULT 1, "p_unit_price" numeric DEFAULT 0, "p_availability_status" "text" DEFAULT 'available'::"text", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."prescription_quote_items"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_vendor_id uuid;
  v_quote public.prescription_quotes;
  v_product public.products;
  v_item public.prescription_quote_items;
  v_product_name text;
  v_unit_price numeric;
  v_line_total numeric;
begin
  v_vendor_id := public.get_vendor_id();

  if v_vendor_id is null then
    raise exception 'Vendor not found.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  if p_availability_status not in ('available', 'unavailable', 'substitute') then
    raise exception 'Invalid availability status.';
  end if;

  select *
  into v_quote
  from public.prescription_quotes
  where id = p_quote_id
    and vendor_id = v_vendor_id
    and status = 'draft';

  if not found then
    raise exception 'Draft quote not found for this vendor.';
  end if;

  if p_product_id is not null then
    select *
    into v_product
    from public.products
    where id = p_product_id
      and vendor_id = v_vendor_id;

    if not found then
      raise exception 'Product not found for this vendor.';
    end if;

    v_product_name := v_product.name;
    v_unit_price := coalesce(v_product.price, 0);
  else
    v_product_name := nullif(trim(coalesce(p_product_name, '')), '');
    v_unit_price := coalesce(p_unit_price, 0);

    if v_product_name is null then
      raise exception 'Product name is required.';
    end if;
  end if;

  if p_availability_status = 'unavailable' then
    v_unit_price := 0;
    v_line_total := 0;
  else
    if v_unit_price < 0 then
      raise exception 'Unit price cannot be negative.';
    end if;

    v_line_total := p_quantity * v_unit_price;
  end if;

  if p_item_id is not null then
    update public.prescription_quote_items
    set
      product_id = p_product_id,
      product_name = v_product_name,
      quantity = p_quantity,
      unit_price = v_unit_price,
      line_total = v_line_total,
      availability_status = p_availability_status,
      note = p_note
    where id = p_item_id
      and quote_id = p_quote_id
    returning * into v_item;

    if not found then
      raise exception 'Quote item not found.';
    end if;
  else
    insert into public.prescription_quote_items (
      quote_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total,
      availability_status,
      note
    )
    values (
      p_quote_id,
      p_product_id,
      v_product_name,
      p_quantity,
      v_unit_price,
      v_line_total,
      p_availability_status,
      p_note
    )
    returning * into v_item;
  end if;

  perform public.recalculate_prescription_quote_subtotal(p_quote_id);

  return v_item;
end;
$$;


ALTER FUNCTION "public"."vendor_upsert_prescription_quote_item"("p_quote_id" "uuid", "p_item_id" "uuid", "p_product_id" "uuid", "p_product_name" "text", "p_quantity" integer, "p_unit_price" numeric, "p_availability_status" "text", "p_note" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "line_1" "text" NOT NULL,
    "lat" numeric(10,7),
    "lng" numeric(10,7),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name_ar" "text",
    "parent_id" "uuid",
    "slug" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "discount_type" "text" DEFAULT 'percent'::"text" NOT NULL,
    "discount_value" numeric(10,2) DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_favorite_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_favorite_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_favorite_vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_favorite_vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_favourite_vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_favourite_vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "default_address_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expo_push_token" "text"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "driver_id" "uuid",
    "lat" numeric(10,7),
    "lng" numeric(10,7),
    "status" "public"."order_status" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."delivery_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_available" boolean DEFAULT false NOT NULL,
    "current_lat" numeric(10,7),
    "current_lng" numeric(10,7),
    "approval_status" "public"."approval_status" DEFAULT 'pending'::"public"."approval_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_image_url" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "vehicle_type" "text",
    "vehicle_plate" "text",
    "expo_push_token" "text"
);


ALTER TABLE "public"."drivers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "barcode" "text",
    "name" "text" NOT NULL,
    "name_ar" "text",
    "brand" "text",
    "description" "text",
    "category_slug" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."global_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_name" "text" NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "driver_id" "uuid",
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "delivery_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "payment_method" "public"."payment_method" DEFAULT 'cash_on_delivery'::"public"."payment_method" NOT NULL,
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "order_status" "public"."order_status" DEFAULT 'placed'::"public"."order_status" NOT NULL,
    "delivery_address_id" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    "assigned_at" timestamp with time zone,
    "arrived_at_pharmacy_at" timestamp with time zone,
    "picked_up_at" timestamp with time zone,
    "on_the_way_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "delivery_distance_km" numeric,
    "prescription_quote_id" "uuid"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "image_url" "text",
    "barcode" "text",
    "stock_quantity" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "low_stock_threshold" integer DEFAULT 5 NOT NULL,
    CONSTRAINT "products_price_nonnegative" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."products_with_global_images" AS
 SELECT "p"."id",
    "p"."vendor_id",
    "p"."category_id",
    "p"."name",
    "p"."description",
    "p"."price",
    "p"."image_url",
    "p"."barcode",
    "p"."stock_quantity",
    "p"."is_active",
    "p"."created_at",
    "gp"."image_url" AS "global_image_url",
    COALESCE("p"."image_url", "gp"."image_url") AS "resolved_image_url",
    "p"."low_stock_threshold"
   FROM ("public"."products" "p"
     LEFT JOIN "public"."global_products" "gp" ON (("gp"."barcode" = "p"."barcode")));


ALTER VIEW "public"."products_with_global_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "full_name" "text" NOT NULL,
    "phone" "text",
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'customer'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "vendor_id" "uuid",
    "driver_id" "uuid",
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_operating_hours" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "opens_at" time without time zone,
    "closes_at" time without time zone,
    "is_closed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vendor_operating_hours_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."vendor_operating_hours" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text",
    "description" "text",
    "phone" "text",
    "address_line_1" "text",
    "address_line_2" "text",
    "city" "text",
    "area" "text",
    "lat" numeric(10,7),
    "lng" numeric(10,7),
    "approval_status" "public"."approval_status" DEFAULT 'pending'::"public"."approval_status" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "image_url" "text",
    "license_number" "text",
    "contact_email" "text",
    "minimum_order_amount" numeric DEFAULT 0 NOT NULL,
    "delivery_radius_km" numeric DEFAULT 8 NOT NULL
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_favorite_products"
    ADD CONSTRAINT "customer_favorite_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_favorite_products"
    ADD CONSTRAINT "customer_favorite_products_unique" UNIQUE ("customer_id", "product_id");



ALTER TABLE ONLY "public"."customer_favorite_vendors"
    ADD CONSTRAINT "customer_favorite_vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_favorite_vendors"
    ADD CONSTRAINT "customer_favorite_vendors_unique" UNIQUE ("customer_id", "vendor_id");



ALTER TABLE ONLY "public"."customer_favourite_vendors"
    ADD CONSTRAINT "customer_favourite_vendors_customer_id_vendor_id_key" UNIQUE ("customer_id", "vendor_id");



ALTER TABLE ONLY "public"."customer_favourite_vendors"
    ADD CONSTRAINT "customer_favourite_vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."global_products"
    ADD CONSTRAINT "global_products_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."global_products"
    ADD CONSTRAINT "global_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."prescription_quote_items"
    ADD CONSTRAINT "prescription_quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_quotes"
    ADD CONSTRAINT "prescription_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_operating_hours"
    ADD CONSTRAINT "vendor_operating_hours_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_operating_hours"
    ADD CONSTRAINT "vendor_operating_hours_vendor_id_day_of_week_key" UNIQUE ("vendor_id", "day_of_week");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_user_id_key" UNIQUE ("user_id");



CREATE UNIQUE INDEX "categories_slug_unique_idx" ON "public"."categories" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_delivery_tracking_order" ON "public"."delivery_tracking" USING "btree" ("order_id", "recorded_at" DESC);



CREATE INDEX "idx_orders_customer" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_driver" ON "public"."orders" USING "btree" ("driver_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("order_status");



CREATE INDEX "idx_orders_vendor" ON "public"."orders" USING "btree" ("vendor_id");



CREATE INDEX "idx_products_category" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_vendor" ON "public"."products" USING "btree" ("vendor_id");



CREATE UNIQUE INDEX "notifications_dedupe_key_unique_idx" ON "public"."notifications" USING "btree" ("dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE INDEX "notifications_order_idx" ON "public"."notifications" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "notifications_processing_idx" ON "public"."notifications" USING "btree" ("status", "last_attempt_at") WHERE ("status" = 'processing'::"text");



CREATE INDEX "notifications_queue_idx" ON "public"."notifications" USING "btree" ("status", "created_at") WHERE ("status" = 'queued'::"text");



CREATE INDEX "notifications_recipient_idx" ON "public"."notifications" USING "btree" ("recipient_role", "recipient_id", "created_at" DESC);



CREATE UNIQUE INDEX "orders_prescription_quote_id_unique" ON "public"."orders" USING "btree" ("prescription_quote_id") WHERE ("prescription_quote_id" IS NOT NULL);



CREATE INDEX "prescription_quote_items_product_id_idx" ON "public"."prescription_quote_items" USING "btree" ("product_id");



CREATE INDEX "prescription_quote_items_quote_id_idx" ON "public"."prescription_quote_items" USING "btree" ("quote_id");



CREATE INDEX "prescription_quotes_customer_id_idx" ON "public"."prescription_quotes" USING "btree" ("customer_id");



CREATE UNIQUE INDEX "prescription_quotes_one_draft_per_request_vendor_idx" ON "public"."prescription_quotes" USING "btree" ("prescription_request_id", "vendor_id") WHERE ("status" = 'draft'::"text");



CREATE INDEX "prescription_quotes_request_id_idx" ON "public"."prescription_quotes" USING "btree" ("prescription_request_id");



CREATE INDEX "prescription_quotes_status_idx" ON "public"."prescription_quotes" USING "btree" ("status");



CREATE INDEX "prescription_quotes_vendor_id_idx" ON "public"."prescription_quotes" USING "btree" ("vendor_id");



CREATE INDEX "prescription_requests_created_at_idx" ON "public"."prescription_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "prescription_requests_customer_id_idx" ON "public"."prescription_requests" USING "btree" ("customer_id");



CREATE INDEX "prescription_requests_status_idx" ON "public"."prescription_requests" USING "btree" ("status");



CREATE INDEX "prescription_requests_vendor_id_idx" ON "public"."prescription_requests" USING "btree" ("vendor_id");



CREATE UNIQUE INDEX "products_vendor_barcode_unique_idx" ON "public"."products" USING "btree" ("vendor_id", "barcode") WHERE ("barcode" IS NOT NULL);



CREATE UNIQUE INDEX "vendors_contact_email_unique" ON "public"."vendors" USING "btree" ("lower"(TRIM(BOTH FROM "contact_email"))) WHERE (NULLIF(TRIM(BOTH FROM "contact_email"), ''::"text") IS NOT NULL);



CREATE UNIQUE INDEX "vendors_user_id_unique_nonnull" ON "public"."vendors" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "prescription_requests_set_updated_at" BEFORE UPDATE ON "public"."prescription_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_prescription_requests_updated_at"();



CREATE OR REPLACE TRIGGER "set_prescription_quotes_updated_at" BEFORE UPDATE ON "public"."prescription_quotes" FOR EACH ROW EXECUTE FUNCTION "public"."set_prescription_quotes_updated_at"();



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_favorite_products"
    ADD CONSTRAINT "customer_favorite_products_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_favorite_products"
    ADD CONSTRAINT "customer_favorite_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_favorite_vendors"
    ADD CONSTRAINT "customer_favorite_vendors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_favorite_vendors"
    ADD CONSTRAINT "customer_favorite_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_favourite_vendors"
    ADD CONSTRAINT "customer_favourite_vendors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_favourite_vendors"
    ADD CONSTRAINT "customer_favourite_vendors_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_default_address_fk" FOREIGN KEY ("default_address_id") REFERENCES "public"."addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drivers"
    ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_prescription_quote_id_fkey" FOREIGN KEY ("prescription_quote_id") REFERENCES "public"."prescription_quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."prescription_quote_items"
    ADD CONSTRAINT "prescription_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prescription_quote_items"
    ADD CONSTRAINT "prescription_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."prescription_quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_quotes"
    ADD CONSTRAINT "prescription_quotes_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."prescription_quotes"
    ADD CONSTRAINT "prescription_quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_quotes"
    ADD CONSTRAINT "prescription_quotes_prescription_request_id_fkey" FOREIGN KEY ("prescription_request_id") REFERENCES "public"."prescription_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_quotes"
    ADD CONSTRAINT "prescription_quotes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prescription_requests"
    ADD CONSTRAINT "prescription_requests_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_operating_hours"
    ADD CONSTRAINT "vendor_operating_hours_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can delete products" ON "public"."products" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can insert platform settings" ON "public"."platform_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can manage global products" ON "public"."global_products" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read categories" ON "public"."categories" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read customers" ON "public"."customers" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read drivers" ON "public"."drivers" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read order_items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read platform settings" ON "public"."platform_settings" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read product_images" ON "public"."product_images" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read products" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can read vendors" ON "public"."vendors" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Admins can update drivers" ON "public"."drivers" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update orders driver" ON "public"."orders" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update platform settings" ON "public"."platform_settings" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update products" ON "public"."products" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Authenticated users can read platform settings" ON "public"."platform_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Customers can create own favourite vendors" ON "public"."customer_favourite_vendors" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can delete own favourite vendors" ON "public"."customer_favourite_vendors" FOR DELETE TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can insert own addresses" ON "public"."addresses" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can read own customer row" ON "public"."customers" FOR SELECT TO "authenticated" USING (("id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can read own favourite vendors" ON "public"."customer_favourite_vendors" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can read own order_items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."customer_id" = "public"."get_customer_id"())))));



CREATE POLICY "Customers can read own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can update own customer row" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("id" = "public"."get_customer_id"())) WITH CHECK (("id" = "public"."get_customer_id"()));



CREATE POLICY "Customers can view own addresses" ON "public"."addresses" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "Drivers can read available pickup orders" ON "public"."orders" FOR SELECT TO "authenticated" USING ((("order_status" = 'ready_for_pickup'::"public"."order_status") AND ("driver_id" IS NULL) AND ("public"."get_driver_id"() IS NOT NULL)));



CREATE POLICY "Drivers can read own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("driver_id" = "public"."get_driver_id"()));



CREATE POLICY "Drivers can read their own record" ON "public"."drivers" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Drivers can update own editable profile" ON "public"."drivers" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"())))) WITH CHECK (("user_id" = ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."auth_user_id" = "auth"."uid"()))));



CREATE POLICY "Drivers can update own orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("driver_id" = "public"."get_driver_id"())) WITH CHECK (("driver_id" = "public"."get_driver_id"()));



CREATE POLICY "Users can read their own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "auth_user_id"));



CREATE POLICY "Vendors can insert own products" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "Vendors can read categories" ON "public"."categories" FOR SELECT TO "authenticated" USING (("public"."get_vendor_id"() IS NOT NULL));



CREATE POLICY "Vendors can read own orders" ON "public"."orders" FOR SELECT TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "Vendors can read own products" ON "public"."products" FOR SELECT TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "Vendors can update own orders" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"())) WITH CHECK (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "Vendors can update own products" ON "public"."products" FOR UPDATE TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"())) WITH CHECK (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "Vendors manage own products" ON "public"."products" TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"())) WITH CHECK (("vendor_id" = "public"."get_vendor_id"()));



ALTER TABLE "public"."addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admins can manage prescription quote items" ON "public"."prescription_quote_items" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins can manage prescription quotes" ON "public"."prescription_quotes" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "admins can select all products" ON "public"."products" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admins can select all vendors" ON "public"."vendors" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "authenticated users can read vendor operating hours" ON "public"."vendor_operating_hours" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can select active approved vendors" ON "public"."vendors" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("approval_status" = 'approved'::"public"."approval_status")));



CREATE POLICY "authenticated users can select categories" ON "public"."categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated users can select sellable products" ON "public"."products" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND ("stock_quantity" > 0) AND (EXISTS ( SELECT 1
   FROM "public"."vendors" "v"
  WHERE (("v"."id" = "products"."vendor_id") AND ("v"."is_active" = true) AND ("v"."approval_status" = 'approved'::"public"."approval_status"))))));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_favorite_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_favorite_vendors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_favourite_vendors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers can add own favorite products" ON "public"."customer_favorite_products" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can add own favorite vendors" ON "public"."customer_favorite_vendors" FOR INSERT TO "authenticated" WITH CHECK (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can cancel own pending prescription requests" ON "public"."prescription_requests" FOR UPDATE TO "authenticated" USING ((("customer_id" = "public"."get_customer_id"()) AND ("status" = 'pending'::"text"))) WITH CHECK ((("customer_id" = "public"."get_customer_id"()) AND ("status" = 'cancelled'::"text")));



CREATE POLICY "customers can create own prescription requests" ON "public"."prescription_requests" FOR INSERT TO "authenticated" WITH CHECK ((("customer_id" = "public"."get_customer_id"()) AND ("status" = 'pending'::"text")));



CREATE POLICY "customers can delete own addresses" ON "public"."addresses" FOR DELETE TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can read own favorite products" ON "public"."customer_favorite_products" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can read own favorite vendors" ON "public"."customer_favorite_vendors" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can read own order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."customer_id" = "public"."get_customer_id"())))));



CREATE POLICY "customers can remove own favorite products" ON "public"."customer_favorite_products" FOR DELETE TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can remove own favorite vendors" ON "public"."customer_favorite_vendors" FOR DELETE TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can respond to own sent prescription quotes" ON "public"."prescription_quotes" FOR UPDATE TO "authenticated" USING ((("customer_id" = "public"."get_customer_id"()) AND ("status" = 'sent'::"text"))) WITH CHECK ((("customer_id" = "public"."get_customer_id"()) AND ("status" = ANY (ARRAY['accepted'::"text", 'rejected'::"text"]))));



CREATE POLICY "customers can select own prescription quote items" ON "public"."prescription_quote_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_quotes" "q"
  WHERE (("q"."id" = "prescription_quote_items"."quote_id") AND ("q"."customer_id" = "public"."get_customer_id"())))));



CREATE POLICY "customers can select own prescription quotes" ON "public"."prescription_quotes" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



CREATE POLICY "customers can view own prescription requests" ON "public"."prescription_requests" FOR SELECT TO "authenticated" USING (("customer_id" = "public"."get_customer_id"()));



ALTER TABLE "public"."delivery_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "drivers can read assigned order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."driver_id" = "public"."get_driver_id"())))));



CREATE POLICY "drivers can read customer profile rows for visible orders by pr" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."customers" "c" ON (("c"."id" = "o"."customer_id")))
  WHERE (("c"."user_id" = "profiles"."id") AND (("o"."driver_id" = "public"."get_driver_id"()) OR (("o"."order_status" = 'ready_for_pickup'::"public"."order_status") AND ("o"."driver_id" IS NULL)))))));



CREATE POLICY "drivers can read customer profiles for visible orders" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."customers" "c" ON (("c"."id" = "o"."customer_id")))
  WHERE (("c"."user_id" = "profiles"."auth_user_id") AND (("o"."driver_id" = "public"."get_driver_id"()) OR (("o"."order_status" = 'ready_for_pickup'::"public"."order_status") AND ("o"."driver_id" IS NULL)))))));



CREATE POLICY "drivers can read customers for visible orders" ON "public"."customers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."customer_id" = "customers"."id") AND (("o"."driver_id" = "public"."get_driver_id"()) OR (("o"."order_status" = 'ready_for_pickup'::"public"."order_status") AND ("o"."driver_id" IS NULL)))))));



CREATE POLICY "drivers can read delivery addresses for visible orders" ON "public"."addresses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."delivery_address_id" = "addresses"."id") AND (("o"."driver_id" = "public"."get_driver_id"()) OR (("o"."order_status" = 'ready_for_pickup'::"public"."order_status") AND ("o"."driver_id" IS NULL)))))));



CREATE POLICY "drivers can read vendors for visible orders" ON "public"."vendors" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."vendor_id" = "vendors"."id") AND (("o"."driver_id" = "public"."get_driver_id"()) OR (("o"."order_status" = 'ready_for_pickup'::"public"."order_status") AND ("o"."driver_id" IS NULL)))))));



CREATE POLICY "drivers can select vendors for assigned orders" ON "public"."vendors" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."vendor_id" = "vendors"."id") AND ("o"."driver_id" = "public"."get_driver_id"())))));



ALTER TABLE "public"."global_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prescription_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_operating_hours" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendors can accept or reject own pending prescription requests" ON "public"."prescription_requests" FOR UPDATE TO "authenticated" USING ((("vendor_id" = "public"."get_vendor_id"()) AND ("status" = 'pending'::"text"))) WITH CHECK ((("vendor_id" = "public"."get_vendor_id"()) AND ("status" = ANY (ARRAY['accepted'::"text", 'rejected'::"text"]))));



CREATE POLICY "vendors can delete own draft prescription quote items" ON "public"."prescription_quote_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_quotes" "q"
  WHERE (("q"."id" = "prescription_quote_items"."quote_id") AND ("q"."vendor_id" = "public"."get_vendor_id"()) AND ("q"."status" = 'draft'::"text")))));



CREATE POLICY "vendors can insert own draft prescription quote items" ON "public"."prescription_quote_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."prescription_quotes" "q"
  WHERE (("q"."id" = "prescription_quote_items"."quote_id") AND ("q"."vendor_id" = "public"."get_vendor_id"()) AND ("q"."status" = 'draft'::"text")))));



CREATE POLICY "vendors can insert own prescription quotes" ON "public"."prescription_quotes" FOR INSERT TO "authenticated" WITH CHECK (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "vendors can read order items" ON "public"."order_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."vendor_id" = "public"."get_vendor_id"())))));



CREATE POLICY "vendors can read prescription request addresses" ON "public"."addresses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_requests" "pr"
  WHERE (("pr"."address_id" = "addresses"."id") AND ("pr"."vendor_id" = "public"."get_vendor_id"())))));



CREATE POLICY "vendors can read prescription request customers" ON "public"."customers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_requests" "pr"
  WHERE (("pr"."customer_id" = "customers"."id") AND ("pr"."vendor_id" = "public"."get_vendor_id"())))));



CREATE POLICY "vendors can read prescription request profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."customers" "c"
     JOIN "public"."prescription_requests" "pr" ON (("pr"."customer_id" = "c"."id")))
  WHERE (("c"."user_id" = "profiles"."id") AND ("pr"."vendor_id" = "public"."get_vendor_id"())))));



CREATE POLICY "vendors can select own prescription quote items" ON "public"."prescription_quote_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_quotes" "q"
  WHERE (("q"."id" = "prescription_quote_items"."quote_id") AND ("q"."vendor_id" = "public"."get_vendor_id"())))));



CREATE POLICY "vendors can select own prescription quotes" ON "public"."prescription_quotes" FOR SELECT TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "vendors can select own products" ON "public"."products" FOR SELECT TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "vendors can select own vendor profile" ON "public"."vendors" FOR SELECT TO "authenticated" USING (("id" = "public"."get_vendor_id"()));



CREATE POLICY "vendors can update own draft prescription quote items" ON "public"."prescription_quote_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."prescription_quotes" "q"
  WHERE (("q"."id" = "prescription_quote_items"."quote_id") AND ("q"."vendor_id" = "public"."get_vendor_id"()) AND ("q"."status" = 'draft'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."prescription_quotes" "q"
  WHERE (("q"."id" = "prescription_quote_items"."quote_id") AND ("q"."vendor_id" = "public"."get_vendor_id"()) AND ("q"."status" = 'draft'::"text")))));



CREATE POLICY "vendors can update own draft prescription quotes" ON "public"."prescription_quotes" FOR UPDATE TO "authenticated" USING ((("vendor_id" = "public"."get_vendor_id"()) AND ("status" = 'draft'::"text"))) WITH CHECK (("vendor_id" = "public"."get_vendor_id"()));



CREATE POLICY "vendors can view own prescription requests" ON "public"."prescription_requests" FOR SELECT TO "authenticated" USING (("vendor_id" = "public"."get_vendor_id"()));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_assign_driver"("p_order_id" "uuid", "p_driver_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_assign_driver"("p_order_id" "uuid", "p_driver_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_assign_driver"("p_order_id" "uuid", "p_driver_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_category"("p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_product"("p_vendor_id" "uuid", "p_name" "text", "p_barcode" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_image_url" "text", "p_stock_quantity" integer, "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_product"("p_vendor_id" "uuid", "p_name" "text", "p_barcode" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_image_url" "text", "p_stock_quantity" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_product"("p_vendor_id" "uuid", "p_name" "text", "p_barcode" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_image_url" "text", "p_stock_quantity" integer, "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_create_vendor"("p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_approval_status" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_vendor"("p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_approval_status" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_vendor"("p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_approval_status" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_deactivate_product"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_deactivate_product"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_deactivate_product"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_delete_category"("p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_delete_category"("p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_delete_category"("p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_list_vendors"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_vendors"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_vendors"() TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_category"("p_category_id" "uuid", "p_name" "text", "p_name_ar" "text", "p_slug" "text", "p_icon" "text", "p_image_url" "text", "p_sort_order" integer, "p_is_active" boolean, "p_parent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_driver"("p_driver_id" "uuid", "p_approval_status" "text", "p_is_available" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_driver"("p_driver_id" "uuid", "p_approval_status" "text", "p_is_available" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_driver"("p_driver_id" "uuid", "p_approval_status" "text", "p_is_available" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_global_product_category"("p_product_id" "uuid", "p_category_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_global_product_category"("p_product_id" "uuid", "p_category_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_global_product_category"("p_product_id" "uuid", "p_category_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_barcode" "text", "p_set_barcode" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_barcode" "text", "p_set_barcode" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_barcode" "text", "p_set_barcode" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_vendor"("p_vendor_id" "uuid", "p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_set_lat" boolean, "p_set_lng" boolean, "p_approval_status" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_vendor"("p_vendor_id" "uuid", "p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_set_lat" boolean, "p_set_lng" boolean, "p_approval_status" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_vendor"("p_vendor_id" "uuid", "p_profile_id" "uuid", "p_name" "text", "p_slug" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text", "p_contact_email" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric, "p_set_lat" boolean, "p_set_lng" boolean, "p_approval_status" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_order_status_timestamp"("p_next_status" "text", "p_accepted_at" timestamp with time zone, "p_assigned_at" timestamp with time zone, "p_arrived_at_pharmacy_at" timestamp with time zone, "p_picked_up_at" timestamp with time zone, "p_on_the_way_at" timestamp with time zone, "p_delivered_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_rejected_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_order_status_timestamp"("p_next_status" "text", "p_accepted_at" timestamp with time zone, "p_assigned_at" timestamp with time zone, "p_arrived_at_pharmacy_at" timestamp with time zone, "p_picked_up_at" timestamp with time zone, "p_on_the_way_at" timestamp with time zone, "p_delivered_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_rejected_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_order_status_timestamp"("p_next_status" "text", "p_accepted_at" timestamp with time zone, "p_assigned_at" timestamp with time zone, "p_arrived_at_pharmacy_at" timestamp with time zone, "p_picked_up_at" timestamp with time zone, "p_on_the_way_at" timestamp with time zone, "p_delivered_at" timestamp with time zone, "p_cancelled_at" timestamp with time zone, "p_rejected_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_driver_to_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_driver_to_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_driver_to_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_distance_km"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_distance_km"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_distance_km"("lat1" double precision, "lng1" double precision, "lat2" double precision, "lng2" double precision) TO "service_role";



GRANT ALL ON TABLE "public"."prescription_requests" TO "anon";
GRANT ALL ON TABLE "public"."prescription_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_requests" TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_prescription_request"("p_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_prescription_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_prescription_request"("p_request_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_queued_notifications"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_queued_notifications"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_queued_notifications"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_cod_order"("cart_items_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_cod_order"("cart_items_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_cod_order"("cart_items_input" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_cod_order_from_quote"("p_quote_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_cod_order_from_quote"("p_quote_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_cod_order_from_quote"("p_quote_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."prescription_quotes" TO "anon";
GRANT ALL ON TABLE "public"."prescription_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_quotes" TO "service_role";



GRANT ALL ON FUNCTION "public"."customer_respond_prescription_quote"("p_quote_id" "uuid", "p_response" "text", "p_customer_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."customer_respond_prescription_quote"("p_quote_id" "uuid", "p_response" "text", "p_customer_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_respond_prescription_quote"("p_quote_id" "uuid", "p_response" "text", "p_customer_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."driver_claim_order"("p_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."driver_claim_order"("p_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."driver_claim_order"("p_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."driver_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."driver_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."driver_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_order_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_order_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_driver_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_driver_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_driver_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_vendor_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_vendor_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_vendor_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."queue_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."queue_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."queue_notification"("p_recipient_role" "text", "p_recipient_id" "uuid", "p_order_id" "uuid", "p_title" "text", "p_body" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_prescription_quote_subtotal"("p_quote_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_prescription_quote_subtotal"("p_quote_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_prescription_quote_subtotal"("p_quote_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_driver_account"("p_full_name" "text", "p_phone" "text", "p_vehicle_type" "text", "p_vehicle_plate" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_driver_account"("p_full_name" "text", "p_phone" "text", "p_vehicle_type" "text", "p_vehicle_plate" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_driver_account"("p_full_name" "text", "p_phone" "text", "p_vehicle_type" "text", "p_vehicle_plate" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_vendor_account"("p_full_name" "text", "p_vendor_name" "text", "p_slug" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_description" "text", "p_image_url" "text", "p_license_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_prescription_quotes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_prescription_quotes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_prescription_quotes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_prescription_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_prescription_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_prescription_requests_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_activate_product"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_activate_product"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_activate_product"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_create_prescription_quote"("p_prescription_request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_create_prescription_quote"("p_prescription_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_create_prescription_quote"("p_prescription_request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_create_product"("p_category_id" "uuid", "p_description" "text", "p_image_url" "text", "p_name" "text", "p_price" numeric, "p_stock_quantity" integer, "p_low_stock_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_create_product"("p_category_id" "uuid", "p_description" "text", "p_image_url" "text", "p_name" "text", "p_price" numeric, "p_stock_quantity" integer, "p_low_stock_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_create_product"("p_category_id" "uuid", "p_description" "text", "p_image_url" "text", "p_name" "text", "p_price" numeric, "p_stock_quantity" integer, "p_low_stock_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_deactivate_product"("p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_deactivate_product"("p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_deactivate_product"("p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_delete_prescription_quote_item"("p_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_delete_prescription_quote_item"("p_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_delete_prescription_quote_item"("p_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_respond_prescription_request"("p_request_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_respond_prescription_request"("p_request_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_respond_prescription_request"("p_request_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_send_prescription_quote"("p_quote_id" "uuid", "p_vendor_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_send_prescription_quote"("p_quote_id" "uuid", "p_vendor_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_send_prescription_quote"("p_quote_id" "uuid", "p_vendor_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_update_order_status"("p_order_id" "uuid", "p_next_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_update_prescription_note"("p_request_id" "uuid", "p_vendor_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_update_prescription_note"("p_request_id" "uuid", "p_vendor_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_update_prescription_note"("p_request_id" "uuid", "p_vendor_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_stock_quantity" integer, "p_low_stock_threshold" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_stock_quantity" integer, "p_low_stock_threshold" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_update_product"("p_product_id" "uuid", "p_name" "text", "p_description" "text", "p_price" numeric, "p_category_id" "uuid", "p_set_category" boolean, "p_image_url" "text", "p_set_image" boolean, "p_stock_quantity" integer, "p_low_stock_threshold" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_update_settings"("p_name" "text", "p_description" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_image_url" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_update_settings"("p_name" "text", "p_description" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_image_url" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_update_settings"("p_name" "text", "p_description" "text", "p_phone" "text", "p_address_line_1" "text", "p_city" "text", "p_area" "text", "p_image_url" "text", "p_lat" numeric, "p_lng" numeric, "p_delivery_radius_km" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."prescription_quote_items" TO "anon";
GRANT ALL ON TABLE "public"."prescription_quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."prescription_quote_items" TO "service_role";



GRANT ALL ON FUNCTION "public"."vendor_upsert_prescription_quote_item"("p_quote_id" "uuid", "p_item_id" "uuid", "p_product_id" "uuid", "p_product_name" "text", "p_quantity" integer, "p_unit_price" numeric, "p_availability_status" "text", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."vendor_upsert_prescription_quote_item"("p_quote_id" "uuid", "p_item_id" "uuid", "p_product_id" "uuid", "p_product_name" "text", "p_quantity" integer, "p_unit_price" numeric, "p_availability_status" "text", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vendor_upsert_prescription_quote_item"("p_quote_id" "uuid", "p_item_id" "uuid", "p_product_id" "uuid", "p_product_name" "text", "p_quantity" integer, "p_unit_price" numeric, "p_availability_status" "text", "p_note" "text") TO "service_role";



GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "anon";
GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";



GRANT ALL ON TABLE "public"."customer_favorite_products" TO "anon";
GRANT ALL ON TABLE "public"."customer_favorite_products" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_favorite_products" TO "service_role";



GRANT ALL ON TABLE "public"."customer_favorite_vendors" TO "anon";
GRANT ALL ON TABLE "public"."customer_favorite_vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_favorite_vendors" TO "service_role";



GRANT ALL ON TABLE "public"."customer_favourite_vendors" TO "anon";
GRANT ALL ON TABLE "public"."customer_favourite_vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_favourite_vendors" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_tracking" TO "anon";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."drivers" TO "anon";
GRANT ALL ON TABLE "public"."drivers" TO "authenticated";
GRANT ALL ON TABLE "public"."drivers" TO "service_role";



GRANT ALL ON TABLE "public"."global_products" TO "anon";
GRANT ALL ON TABLE "public"."global_products" TO "authenticated";
GRANT ALL ON TABLE "public"."global_products" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."products_with_global_images" TO "anon";
GRANT ALL ON TABLE "public"."products_with_global_images" TO "authenticated";
GRANT ALL ON TABLE "public"."products_with_global_images" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_operating_hours" TO "anon";
GRANT ALL ON TABLE "public"."vendor_operating_hours" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_operating_hours" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







