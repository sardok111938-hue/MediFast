-- Normalize direct table privileges for public.vendors.
--
-- Vendor mutations are performed through controlled SECURITY DEFINER RPCs.
-- Authenticated clients require only SELECT access, scoped by RLS.
-- Anonymous clients do not require direct table access.

revoke all privileges on table public.vendors from anon;
revoke all privileges on table public.vendors from authenticated;

grant select on table public.vendors to authenticated;

revoke all privileges on table public.vendors from service_role;
grant all privileges on table public.vendors to service_role;
