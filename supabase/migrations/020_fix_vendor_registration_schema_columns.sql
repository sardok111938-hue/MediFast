create or replace function public.register_vendor_account(
  p_full_name text,
  p_vendor_name text,
  p_slug text,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.register_vendor_account(text, text, text, text, text, text, text, text) to authenticated;
