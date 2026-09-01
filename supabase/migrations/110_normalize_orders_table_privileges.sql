-- Normalize public.orders privileges across local and remote environments.
--
-- Order creation and mutation happen through dedicated SECURITY DEFINER RPCs.
-- Direct client table access is read-only for authenticated users.
-- Anonymous clients have no reason to access orders directly.

revoke all privileges on table public.orders from anon;
revoke all privileges on table public.orders from authenticated;

grant select on table public.orders to authenticated;

-- Keep the trusted backend role unrestricted explicitly so the final
-- privilege model is deterministic across environments.
grant all privileges on table public.orders to service_role;
