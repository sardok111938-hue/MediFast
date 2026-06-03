-- Standardize MediFast MVP delivery economics
-- Customer delivery fee: 10 LYD
-- Platform max radius: 10 km
-- Vendor default radius: 10 km

alter table public.vendors
  alter column delivery_radius_km set default 10;

update public.vendors
set delivery_radius_km = 10
where delivery_radius_km is null
   or delivery_radius_km > 10;

update public.platform_settings
set value = jsonb_build_object(
  'base_fee', 10,
  'per_km_fee', 0,
  'max_radius_km', 10
)
where key = 'delivery';

create or replace function public.calculate_delivery_fee(distance_km numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $function$
begin
  return 10.00::numeric(10,2);
end;
$function$;

grant execute on function public.calculate_delivery_fee(numeric) to authenticated;