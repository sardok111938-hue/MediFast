create or replace function public.calculate_delivery_fee(distance_km numeric)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  delivery_settings jsonb;
  base_fee numeric := 5;
  per_km_fee numeric := 1;
begin
  select value
  into delivery_settings
  from public.platform_settings
  where key = 'delivery';

  base_fee := coalesce((delivery_settings->>'base_fee')::numeric, 5);
  per_km_fee := coalesce((delivery_settings->>'per_km_fee')::numeric, 1);

  return round(base_fee + (greatest(coalesce(distance_km, 0), 0) * per_km_fee), 2);
end;
$$;

grant execute on function public.calculate_delivery_fee(numeric) to authenticated;