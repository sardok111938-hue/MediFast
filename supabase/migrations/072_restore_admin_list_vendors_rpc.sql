create or replace function public.admin_list_vendors()
returns table (
  vendor_id uuid,
  profile_id uuid,
  auth_user_id uuid,
  email text,
  contact_email text,
  profile_full_name text,
  profile_role text,
  vendor_name text,
  slug text,
  description text,
  image_url text,
  license_number text,
  phone text,
  address_line_1 text,
  city text,
  area text,
  lat numeric,
  lng numeric,
  delivery_radius_km numeric,
  approval_status text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  return query
  select
    v.id,
    p.id,
    p.auth_user_id,
    au.email::text,
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
end;
$$;

grant execute on function public.admin_list_vendors() to authenticated;
