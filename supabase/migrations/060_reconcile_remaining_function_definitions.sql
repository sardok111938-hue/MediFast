drop function if exists public.admin_deactivate_product(uuid);
drop function if exists public.admin_delete_category(uuid);
drop function if exists public.admin_update_driver(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.admin_deactivate_product(p_product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.products
  set is_active = false
  where id = p_product_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_delete_category(p_category_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  delete from public.categories
  where id = p_category_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_update_driver(p_driver_id uuid, p_approval_status text DEFAULT NULL::text, p_is_available boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.drivers
  set
    approval_status = coalesce(p_approval_status::approval_status, approval_status),
    is_available = coalesce(p_is_available, is_available)
  where id = p_driver_id;
end;
$function$
;
