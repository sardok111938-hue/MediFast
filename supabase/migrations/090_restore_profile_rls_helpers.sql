create or replace function public.can_read_assigned_customer_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.user_id = p_profile_id
      and o.driver_id = public.get_driver_id()
  );
$$;

create or replace function public.can_read_prescription_customer_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.customers c
    join public.prescription_requests pr on pr.customer_id = c.id
    where c.user_id = p_profile_id
      and pr.vendor_id = public.get_vendor_id()
  );
$$;

grant execute on function public.can_read_assigned_customer_profile(uuid) to authenticated;
grant execute on function public.can_read_prescription_customer_profile(uuid) to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "drivers can read customer profiles for assigned orders" on public.profiles;
drop policy if exists "vendors can read prescription request profiles" on public.profiles;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "drivers can read customer profiles for assigned orders"
on public.profiles
for select
to authenticated
using (public.can_read_assigned_customer_profile(id));

create policy "vendors can read prescription request profiles"
on public.profiles
for select
to authenticated
using (public.can_read_prescription_customer_profile(id));