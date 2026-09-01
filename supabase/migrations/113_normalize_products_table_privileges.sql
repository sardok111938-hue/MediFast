-- Normalize public.products direct-access privileges and remove direct
-- authenticated write policies.
--
-- Product mutation now happens through dedicated SECURITY DEFINER RPCs.
-- Authenticated clients retain read access through existing SELECT policies.

revoke all privileges on table public.products from anon;
revoke all privileges on table public.products from authenticated;

grant select on table public.products to authenticated;

grant all privileges on table public.products to service_role;

drop policy if exists "Admins can delete products"
on public.products;

drop policy if exists "Admins can insert products"
on public.products;

drop policy if exists "Admins can update products"
on public.products;

drop policy if exists "Vendors can insert own products"
on public.products;

drop policy if exists "Vendors can update own products"
on public.products;

drop policy if exists "Vendors manage own products"
on public.products;
