-- Harden execution privileges for sensitive SECURITY DEFINER RPCs.
-- Preserve function bodies and application behavior.

revoke execute on function public.is_admin()
from public, anon;

revoke execute on function public.admin_assign_driver(uuid, uuid)
from public, anon;

revoke execute on function public.admin_create_category(text, text)
from public, anon;

revoke execute on function public.admin_create_category(
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  uuid
)
from public, anon;

revoke execute on function public.admin_update_category(uuid, text, text)
from public, anon;

revoke execute on function public.admin_update_category(
  uuid,
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  uuid
)
from public, anon;

revoke execute on function public.admin_create_product(
  uuid,
  text,
  text,
  text,
  numeric,
  uuid,
  text,
  integer,
  boolean
)
from public, anon;

revoke execute on function public.admin_update_product(
  uuid,
  text,
  text,
  boolean,
  text,
  numeric,
  uuid,
  boolean,
  text,
  boolean,
  integer,
  boolean
)
from public, anon;

revoke execute on function public.admin_update_product(
  uuid,
  text,
  text,
  numeric,
  uuid,
  boolean,
  text,
  boolean,
  text,
  boolean
)
from public, anon;

revoke execute on function public.create_cod_order(jsonb)
from public, anon;

revoke execute on function public.create_cod_order_from_quote(uuid)
from public, anon;

revoke execute on function public.driver_claim_order(uuid)
from public, anon;

revoke execute on function public.driver_update_order_status(uuid, text)
from public, anon;

revoke execute on function public.vendor_update_order_status(uuid, text)
from public, anon;


-- Explicitly preserve the intended authenticated application access.

grant execute on function public.is_admin()
to authenticated;

grant execute on function public.admin_assign_driver(uuid, uuid)
to authenticated;

grant execute on function public.admin_create_category(text, text)
to authenticated;

grant execute on function public.admin_create_category(
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  uuid
)
to authenticated;

grant execute on function public.admin_update_category(uuid, text, text)
to authenticated;

grant execute on function public.admin_update_category(
  uuid,
  text,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  uuid
)
to authenticated;

grant execute on function public.admin_create_product(
  uuid,
  text,
  text,
  text,
  numeric,
  uuid,
  text,
  integer,
  boolean
)
to authenticated;

grant execute on function public.admin_update_product(
  uuid,
  text,
  text,
  boolean,
  text,
  numeric,
  uuid,
  boolean,
  text,
  boolean,
  integer,
  boolean
)
to authenticated;

grant execute on function public.admin_update_product(
  uuid,
  text,
  text,
  numeric,
  uuid,
  boolean,
  text,
  boolean,
  text,
  boolean
)
to authenticated;

grant execute on function public.create_cod_order(jsonb)
to authenticated;

grant execute on function public.create_cod_order_from_quote(uuid)
to authenticated;

grant execute on function public.driver_claim_order(uuid)
to authenticated;

grant execute on function public.driver_update_order_status(uuid, text)
to authenticated;

grant execute on function public.vendor_update_order_status(uuid, text)
to authenticated;
