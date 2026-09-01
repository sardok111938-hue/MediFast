begin;

do $$
declare
  fn record;
  function_count integer := 0;
begin
  for fn in
    select
      p.oid,
      p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_create_vendor',
        'admin_list_vendors',
        'admin_update_vendor',
        'get_vendor_id',
        'register_vendor_account',
        'vendor_update_settings'
      )
    order by p.oid::regprocedure::text
  loop
    function_count := function_count + 1;

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

  perform public.test_assert(
    function_count = 6,
    'expected six current vendor RPC signatures after legacy overload cleanup'
  );
end;
$$;

select public.test_pass(
  'vendor RPC execute privilege boundary'
);

rollback;
