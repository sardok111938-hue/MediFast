create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_current_user_admin() to authenticated;

create or replace function public.admin_list_vendors()
returns table (
  vendor_id uuid,
  profile_id uuid,
  auth_user_id uuid,
  email text,
  profile_full_name text,
  profile_role text,
  vendor_name text,
  slug text,
  description text,
  phone text,
  address_line_1 text,
  city text,
  area text,
  lat numeric,
  lng numeric,
  approval_status text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  return query
  select
    v.id as vendor_id,
    p.id as profile_id,
    p.auth_user_id,
    au.email::text as email,
    p.full_name as profile_full_name,
    p.role::text as profile_role,
    v.name as vendor_name,
    v.slug,
    v.description,
    v.phone,
    v.address_line_1,
    v.city,
    v.area,
    v.lat,
    v.lng,
    v.approval_status::text as approval_status,
    v.is_active
  from public.vendors v
  left join public.profiles p on p.id = v.user_id
  left join auth.users au on au.id = p.auth_user_id
  order by v.created_at desc;
end;
$$;

grant execute on function public.admin_list_vendors() to authenticated;

create or replace function public.admin_search_profiles(
  p_query text default null,
  p_role text default null
)
returns table (
  profile_id uuid,
  auth_user_id uuid,
  email text,
  full_name text,
  role text,
  phone text,
  existing_vendor_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_query text;
  normalized_role text;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  normalized_query := nullif(trim(coalesce(p_query, '')), '');
  normalized_role := nullif(trim(coalesce(p_role, '')), '');

  return query
  select
    p.id as profile_id,
    p.auth_user_id,
    au.email::text as email,
    p.full_name,
    p.role::text as role,
    p.phone,
    v.id as existing_vendor_id
  from public.profiles p
  left join auth.users au on au.id = p.auth_user_id
  left join public.vendors v on v.user_id = p.id
  where (
    normalized_role is null
    or p.role::text = normalized_role
  )
  and (
    normalized_query is null
    or p.full_name ilike '%' || normalized_query || '%'
    or p.role::text ilike '%' || normalized_query || '%'
    or coalesce(p.auth_user_id::text, '') ilike '%' || normalized_query || '%'
    or coalesce(au.email, '') ilike '%' || normalized_query || '%'
  )
  order by p.created_at desc
  limit 25;
end;
$$;

grant execute on function public.admin_search_profiles(text, text) to authenticated;

create or replace function public.admin_create_vendor(
  p_profile_id uuid,
  p_name text,
  p_slug text,
  p_description text default null,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_approval_status text default 'pending',
  p_is_active boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_vendor_id uuid;
  resolved_approval_status public.approval_status;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_profile_id is null then
    raise exception 'Profile is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Vendor name is required.';
  end if;

  if nullif(trim(coalesce(p_slug, '')), '') is null then
    raise exception 'Vendor slug is required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
  ) then
    raise exception 'Selected profile was not found.';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = p_profile_id
      and p.role = 'admin'
  ) then
    raise exception 'Admin profiles cannot be linked as vendors.';
  end if;

  if exists (
    select 1
    from public.vendors v
    where v.user_id = p_profile_id
  ) then
    raise exception 'Selected profile is already linked to a vendor.';
  end if;

  resolved_approval_status := coalesce(nullif(trim(coalesce(p_approval_status, '')), '')::public.approval_status, 'pending');

  update public.profiles
  set role = 'vendor'
  where id = p_profile_id
    and role <> 'admin';

  insert into public.vendors (
    user_id,
    name,
    slug,
    description,
    phone,
    address_line_1,
    city,
    area,
    lat,
    lng,
    approval_status,
    is_active
  )
  values (
    p_profile_id,
    trim(p_name),
    trim(p_slug),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_address_line_1, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    nullif(trim(coalesce(p_area, '')), ''),
    p_lat,
    p_lng,
    resolved_approval_status,
    coalesce(p_is_active, false)
  )
  returning id into resolved_vendor_id;

  return resolved_vendor_id;
end;
$$;

grant execute on function public.admin_create_vendor(uuid, text, text, text, text, text, text, text, numeric, numeric, text, boolean) to authenticated;

create or replace function public.admin_update_vendor(
  p_vendor_id uuid,
  p_profile_id uuid default null,
  p_name text default null,
  p_slug text default null,
  p_description text default null,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_set_lat boolean default false,
  p_set_lng boolean default false,
  p_approval_status text default null,
  p_is_active boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_vendor public.vendors%rowtype;
  next_profile_id uuid;
  resolved_approval_status public.approval_status;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  select *
  into target_vendor
  from public.vendors v
  where v.id = p_vendor_id;

  if target_vendor.id is null then
    raise exception 'Vendor could not be resolved.';
  end if;

  next_profile_id := coalesce(p_profile_id, target_vendor.user_id);

  if next_profile_id is null then
    raise exception 'Linked profile is required.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = next_profile_id
  ) then
    raise exception 'Selected profile was not found.';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = next_profile_id
      and p.role = 'admin'
  ) then
    raise exception 'Admin profiles cannot be linked as vendors.';
  end if;

  if exists (
    select 1
    from public.vendors v
    where v.user_id = next_profile_id
      and v.id <> p_vendor_id
  ) then
    raise exception 'Selected profile is already linked to another vendor.';
  end if;

  update public.profiles
  set role = 'vendor'
  where id = next_profile_id
    and role <> 'admin';

  resolved_approval_status := case
    when nullif(trim(coalesce(p_approval_status, '')), '') is null then target_vendor.approval_status
    else nullif(trim(coalesce(p_approval_status, '')), '')::public.approval_status
  end;

  update public.vendors
  set
    user_id = next_profile_id,
    name = coalesce(nullif(trim(coalesce(p_name, '')), ''), target_vendor.name),
    slug = coalesce(nullif(trim(coalesce(p_slug, '')), ''), target_vendor.slug),
    description = case
      when p_description is null then target_vendor.description
      else nullif(trim(p_description), '')
    end,
    phone = case
      when p_phone is null then target_vendor.phone
      else nullif(trim(p_phone), '')
    end,
    address_line_1 = case
      when p_address_line_1 is null then target_vendor.address_line_1
      else nullif(trim(p_address_line_1), '')
    end,
    city = case
      when p_city is null then target_vendor.city
      else nullif(trim(p_city), '')
    end,
    area = case
      when p_area is null then target_vendor.area
      else nullif(trim(p_area), '')
    end,
    lat = case when p_set_lat then p_lat else target_vendor.lat end,
    lng = case when p_set_lng then p_lng else target_vendor.lng end,
    approval_status = resolved_approval_status,
    is_active = coalesce(p_is_active, target_vendor.is_active)
  where id = p_vendor_id;

  return p_vendor_id;
end;
$$;

grant execute on function public.admin_update_vendor(uuid, uuid, text, text, text, text, text, text, text, numeric, numeric, boolean, boolean, text, boolean) to authenticated;
