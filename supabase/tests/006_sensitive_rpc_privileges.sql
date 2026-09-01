begin;

select test_assert(
  not has_function_privilege(
    'anon',
    'public.is_admin()',
    'EXECUTE'
  ),
  'anon cannot execute is_admin'
);

select test_assert(
  has_function_privilege(
    'authenticated',
    'public.is_admin()',
    'EXECUTE'
  ),
  'authenticated can execute is_admin'
);

do $$
declare
  target regprocedure;
  targets regprocedure[] := array[
    'public.admin_assign_driver(uuid,uuid)'::regprocedure,
    'public.admin_create_category(text,text)'::regprocedure,
    'public.admin_create_category(text,text,text,text,text,integer,boolean,uuid)'::regprocedure,
    'public.admin_update_category(uuid,text,text)'::regprocedure,
    'public.admin_update_category(uuid,text,text,text,text,text,integer,boolean,uuid)'::regprocedure,
    'public.admin_create_product(uuid,text,text,text,numeric,uuid,text,integer,boolean)'::regprocedure,
    'public.admin_update_product(uuid,text,text,boolean,text,numeric,uuid,boolean,text,boolean,integer,boolean)'::regprocedure,
    'public.admin_update_product(uuid,text,text,numeric,uuid,boolean,text,boolean,text,boolean)'::regprocedure,
    'public.create_cod_order(jsonb)'::regprocedure,
    'public.create_cod_order_from_quote(uuid)'::regprocedure,
    'public.driver_claim_order(uuid)'::regprocedure,
    'public.driver_update_order_status(uuid,text)'::regprocedure,
    'public.vendor_update_order_status(uuid,text)'::regprocedure
  ];
begin
  foreach target in array targets loop
    if has_function_privilege('anon', target, 'EXECUTE') then
      raise exception
        'TEST FAILED: anon can execute %',
        target::text;
    end if;

    if not has_function_privilege('authenticated', target, 'EXECUTE') then
      raise exception
        'TEST FAILED: authenticated cannot execute %',
        target::text;
    end if;
  end loop;
end;
$$;

select test_pass('sensitive RPC execute privilege contract');

rollback;
