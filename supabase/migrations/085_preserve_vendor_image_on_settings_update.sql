create or replace function public.vendor_update_settings(
  p_name text default null,
  p_description text default null,
  p_phone text default null,
  p_address_line_1 text default null,
  p_city text default null,
  p_area text default null,
  p_image_url text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_delivery_radius_km numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    image_url = coalesce(nullif(trim(p_image_url), ''), image_url),
    lat = p_lat,
    lng = p_lng,
    delivery_radius_km = coalesce(p_delivery_radius_km, delivery_radius_km)
  where id = v_vendor_id;
end;
$$;

grant execute on function public.vendor_update_settings(
  text, text, text, text, text, text, text, numeric, numeric, numeric
) to authenticated;
