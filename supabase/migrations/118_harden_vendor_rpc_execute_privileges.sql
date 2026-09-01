-- Harden execution privileges for the vendor/account/admin RPC boundary.
--
-- These SECURITY DEFINER functions operate on authenticated identity or
-- enforce admin authorization internally. None is intended for anonymous use.
--
-- Preserve all current function definitions and overloads. Legacy overload
-- removal is intentionally deferred to a separate migration.

do $$
declare
  signature text;
  fn regprocedure;
  signatures text[] := array[
    'public.admin_create_vendor(uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,boolean)',
    'public.admin_list_vendors()',
    'public.admin_update_vendor(uuid,uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,boolean,boolean,text,boolean)',
    'public.get_vendor_id()',
    'public.register_vendor_account(text,text,text,text,text,text,text,text,text,text)',
    'public.register_vendor_account(text,text,text,text,text,text,text,text)',
    'public.vendor_update_settings(text,text,text,text,text,text,text,numeric,numeric,numeric)',
    'public.vendor_update_settings(text,text,text,text,text,text,text)'
  ];
begin
  foreach signature in array signatures loop
    fn := to_regprocedure(signature);

    if fn is null then
      raise exception 'Expected vendor RPC is missing: %', signature;
    end if;

    execute format(
      'revoke execute on function %s from public, anon',
      fn
    );

    execute format(
      'grant execute on function %s to authenticated, service_role',
      fn
    );
  end loop;
end;
$$;
