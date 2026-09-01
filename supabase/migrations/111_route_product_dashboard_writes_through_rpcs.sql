-- Route the remaining dashboard product writes through explicit RPC boundaries.
--
-- Existing admin/vendor product create/update/activate RPCs cover import flows.
-- This migration adds only the missing narrow admin operation used by settings.

create or replace function public.admin_apply_low_stock_threshold(
  p_threshold integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  updated_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_threshold is null or p_threshold < 0 then
    raise exception 'Low stock threshold must be zero or greater.';
  end if;

  update public.products
  set low_stock_threshold = p_threshold;

  get diagnostics updated_count = row_count;

  return updated_count;
end;
$function$;

revoke execute
on function public.admin_apply_low_stock_threshold(integer)
from public, anon;

grant execute
on function public.admin_apply_low_stock_threshold(integer)
to authenticated, service_role;
