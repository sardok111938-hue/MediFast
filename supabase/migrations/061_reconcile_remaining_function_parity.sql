set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.admin_update_product(p_product_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_price numeric DEFAULT NULL::numeric, p_category_id uuid DEFAULT NULL::uuid, p_set_category boolean DEFAULT false, p_image_url text DEFAULT NULL::text, p_set_image boolean DEFAULT false, p_barcode text DEFAULT NULL::text, p_set_barcode boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.register_vendor_account(p_full_name text, p_vendor_name text, p_slug text, p_phone text DEFAULT NULL::text, p_address_line_1 text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_license_number text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.vendor_create_product(p_category_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_name text DEFAULT NULL::text, p_price numeric DEFAULT 0, p_stock_quantity integer DEFAULT 0, p_low_stock_threshold integer DEFAULT 5)
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
$function$
;

CREATE OR REPLACE FUNCTION public.vendor_respond_prescription_request(p_request_id uuid, p_status text)
 RETURNS public.prescription_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.vendor_send_prescription_quote(p_quote_id uuid, p_vendor_note text DEFAULT NULL::text)
 RETURNS public.prescription_quotes
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.vendor_update_product(p_product_id uuid, p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_price numeric DEFAULT NULL::numeric, p_category_id uuid DEFAULT NULL::uuid, p_set_category boolean DEFAULT false, p_image_url text DEFAULT NULL::text, p_set_image boolean DEFAULT false, p_stock_quantity integer DEFAULT NULL::integer, p_low_stock_threshold integer DEFAULT NULL::integer)
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
$function$
;

CREATE OR REPLACE FUNCTION public.vendor_update_settings(p_name text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_address_line_1 text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_area text DEFAULT NULL::text, p_image_url text DEFAULT NULL::text, p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric, p_delivery_radius_km numeric DEFAULT NULL::numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.enqueue_order_notification(p_recipient_role text, p_recipient_id uuid, p_order_id uuid, p_title text, p_body text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    on conflict (dedupe_key) do nothing
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_driver_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d.id
  from public.drivers d
  join public.profiles p on p.id = d.user_id
  where p.auth_user_id = auth.uid()
    and d.approval_status = 'approved'
  order by d.created_at asc, d.id asc
  limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_vendor_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select v.id
  from public.vendors v
  join public.profiles p on p.id = v.user_id
  where p.auth_user_id = auth.uid()
    and v.approval_status = 'approved'
    and v.is_active = true
  order by v.created_at asc, v.id asc
  limit 1;
$function$
;

