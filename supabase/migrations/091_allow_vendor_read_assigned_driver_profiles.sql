create or replace function public.can_vendor_read_assigned_driver_profile(p_profile_id uuid)
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
    join public.drivers d on d.id = o.driver_id
    where d.user_id = p_profile_id
      and o.vendor_id = public.get_vendor_id()
  );
$$;

grant execute on function public.can_vendor_read_assigned_driver_profile(uuid) to authenticated;

drop policy if exists "vendors can read assigned driver profiles for own orders" on public.profiles;

create policy "vendors can read assigned driver profiles for own orders"
on public.profiles
for select
to authenticated
using (
  public.can_vendor_read_assigned_driver_profile(id)
);