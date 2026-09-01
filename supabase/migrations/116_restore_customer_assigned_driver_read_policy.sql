-- Restore the customer assigned-driver read path and normalize the
-- public.drivers access boundary.
--
-- Authenticated clients may read drivers through RLS and drivers may directly
-- update only the small set of self-service fields used by the driver app.
-- Operational fields such as approval status, availability and statistics
-- remain RPC-controlled.

revoke all privileges on table public.drivers from anon;
revoke all privileges on table public.drivers from authenticated;

grant select on table public.drivers to authenticated;

grant update (
  current_lat,
  current_lng,
  expo_push_token,
  emergency_contact_name,
  emergency_contact_phone,
  profile_image_url,
  passport_image_path,
  vehicle_image_path
)
on table public.drivers
to authenticated;

grant all privileges on table public.drivers to service_role;

drop policy if exists "Customers can read assigned driver for own orders"
on public.drivers;

create policy "Customers can read assigned driver for own orders"
on public.drivers
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.driver_id = drivers.id
      and o.customer_id = public.get_customer_id()
  )
);

revoke execute
on function public.admin_update_driver(uuid, text, boolean)
from public, anon;

grant execute
on function public.admin_update_driver(uuid, text, boolean)
to authenticated, service_role;
