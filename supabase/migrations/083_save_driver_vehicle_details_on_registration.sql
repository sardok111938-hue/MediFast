create or replace function public.register_driver_account(
  p_full_name text,
  p_phone text,
  p_vehicle_type text default null,
  p_vehicle_plate text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_profile_id uuid;
  v_driver_id uuid;
begin
  insert into public.profiles (auth_user_id, full_name, phone, role)
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
    approval_status,
    is_available,
    vehicle_type,
    vehicle_plate
  )
  values (
    v_profile_id,
    'pending',
    false,
    nullif(trim(p_vehicle_type), ''),
    nullif(trim(p_vehicle_plate), '')
  )
  on conflict (user_id)
  do update set
    vehicle_type = coalesce(
      nullif(trim(p_vehicle_type), ''),
      public.drivers.vehicle_type
    ),
    vehicle_plate = coalesce(
      nullif(trim(p_vehicle_plate), ''),
      public.drivers.vehicle_plate
    ),
    approval_status = case
      when public.drivers.approval_status = 'approved'
      then public.drivers.approval_status
      else 'pending'::approval_status
    end
  returning id into v_driver_id;

  return v_driver_id;
end;
$function$;