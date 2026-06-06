create or replace function public.ensure_customer_account(
  p_full_name text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_customer_id uuid;
begin
  insert into public.profiles (auth_user_id, full_name, phone, role)
  values (
    auth.uid(),
    coalesce(nullif(trim(p_full_name), ''), 'عميل بدون اسم'),
    nullif(trim(p_phone), ''),
    'customer'
  )
  on conflict (auth_user_id)
  do update set
    full_name = coalesce(nullif(trim(p_full_name), ''), public.profiles.full_name),
    phone = coalesce(nullif(trim(p_phone), ''), public.profiles.phone),
    role = 'customer'
  returning id into v_profile_id;

  insert into public.customers (user_id)
  values (v_profile_id)
  on conflict (user_id)
  do update set user_id = excluded.user_id
  returning id into v_customer_id;

  return v_customer_id;
end;
$$;

grant execute on function public.ensure_customer_account(text, text) to authenticated;
