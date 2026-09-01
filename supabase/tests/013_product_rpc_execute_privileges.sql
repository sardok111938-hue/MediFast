begin;

do $$
declare
  fn record;
begin
  for fn in
    select
      p.oid,
      p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_deactivate_product',
        'admin_update_global_product_category',
        'admin_create_product',
        'admin_update_product',
        'vendor_activate_product',
        'vendor_deactivate_product',
        'vendor_create_product',
        'vendor_update_product'
      )
  loop
    perform public.test_assert(
      not has_function_privilege('anon', fn.oid, 'EXECUTE'),
      'anon cannot execute ' || fn.signature::text
    );

    perform public.test_assert(
      has_function_privilege('authenticated', fn.oid, 'EXECUTE'),
      'authenticated can execute ' || fn.signature::text
    );

    perform public.test_assert(
      has_function_privilege('service_role', fn.oid, 'EXECUTE'),
      'service_role can execute ' || fn.signature::text
    );
  end loop;
end;
$$;

select public.test_pass(
  'product RPC execute privilege boundary'
);

rollback;
