alter table public.vendors
  add column if not exists image_url text;

create or replace function public.vendor_update_settings(
  p_name text,
  p_description text default null,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile_id uuid;
  current_vendor_id uuid;
begin
  select p.id
  into current_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid();

  if current_profile_id is null then
    raise exception 'Vendor profile could not be resolved.';
  end if;

  select v.id
  into current_vendor_id
  from public.vendors v
  where v.user_id = current_profile_id;

  if current_vendor_id is null then
    raise exception 'Vendor record could not be resolved.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Vendor name is required.';
  end if;

  update public.vendors
  set
    name = trim(p_name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    address_line_1 = nullif(trim(coalesce(p_address_line_1, '')), ''),
    city = nullif(trim(coalesce(p_city, '')), ''),
    area = nullif(trim(coalesce(p_area, '')), ''),
    image_url = nullif(trim(coalesce(p_image_url, '')), '')
  where id = current_vendor_id;

  return current_vendor_id;
end;
$$;

grant execute on function public.vendor_update_settings(text, text, text, text, text, text, text) to authenticated;
