-- Harden all existing product-management RPC EXECUTE privileges.
--
-- Local and remote historically contain slightly different legacy overloads.
-- Harden every extant product mutation RPC without recreating obsolete
-- function signatures merely to normalize privileges.

do $$
declare
  signature text;
  fn regprocedure;
  signatures text[] := array[
    'public.admin_deactivate_product(uuid)',
    'public.admin_update_global_product_category(uuid,uuid)',
    'public.admin_create_product(uuid,text,text,text,numeric,uuid,text,integer,boolean)',
    'public.admin_update_product(uuid,text,text,boolean,text,numeric,uuid,boolean,text,boolean,integer,boolean)',
    'public.admin_update_product(uuid,text,text,numeric,uuid,boolean,text,boolean,text,boolean)',
    'public.vendor_activate_product(uuid)',
    'public.vendor_deactivate_product(uuid)',
    'public.vendor_create_product(uuid,text,text,text,numeric,integer,integer,text)',
    'public.vendor_create_product(uuid,text,text,text,numeric,integer,integer)',
    'public.vendor_update_product(uuid,text,text,numeric,uuid,boolean,text,boolean,integer,integer,text,boolean)',
    'public.vendor_update_product(uuid,text,text,numeric,uuid,boolean,text,boolean,integer,integer)'
  ];
begin
  foreach signature in array signatures loop
    fn := to_regprocedure(signature);

    if fn is null then
      raise notice 'Skipping absent legacy product RPC: %', signature;
      continue;
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
