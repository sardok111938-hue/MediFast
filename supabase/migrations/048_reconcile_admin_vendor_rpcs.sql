drop function if exists public.admin_create_vendor(
  uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, text, boolean
);

create or replace function public.admin_create_vendor(
  p_profile_id uuid default null,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_image_url text default null,
  p_license_number text default null,
  p_contact_email text default null,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_delivery_radius_km numeric default 20,
  p_approval_status text default 'approved',
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

grant execute on function public.admin_create_vendor(
  uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, text, boolean
) to authenticated;

drop function if exists public.admin_update_vendor(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, boolean, boolean, text, boolean
);

create or replace function public.admin_update_vendor(
  p_vendor_id uuid,
  p_profile_id uuid default null,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_image_url text default null,
  p_license_number text default null,
  p_contact_email text default null,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_delivery_radius_km numeric default null,
  p_set_lat boolean default false,
  p_set_lng boolean default false,
  p_approval_status text default null,
  p_is_active boolean default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
$function$;

grant execute on function public.admin_update_vendor(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, numeric, boolean, boolean, text, boolean
) to authenticated;
