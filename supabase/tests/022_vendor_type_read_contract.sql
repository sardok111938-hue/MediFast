begin;

select public.test_assert(
  to_regprocedure('public.admin_list_vendors()') is not null,
  'admin_list_vendors exists'
);

select public.test_assert(
  position(
    'vendor_type text'
    in pg_get_function_result(
      'public.admin_list_vendors()'::regprocedure
    )
  ) > 0,
  'admin_list_vendors exposes vendor_type'
);

select public.test_assert(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_list_vendors'
      and p.pronargs = 0
  ),
  'admin_list_vendors remains SECURITY DEFINER'
);

select public.test_assert(
  not has_function_privilege(
    'anon',
    'public.admin_list_vendors()',
    'EXECUTE'
  ),
  'anon cannot execute admin_list_vendors'
);

select public.test_assert(
  has_function_privilege(
    'authenticated',
    'public.admin_list_vendors()',
    'EXECUTE'
  ),
  'authenticated retains admin_list_vendors execution'
);

select public.test_assert(
  has_function_privilege(
    'service_role',
    'public.admin_list_vendors()',
    'EXECUTE'
  ),
  'service_role retains admin_list_vendors execution'
);

select public.test_pass(
  'vendor type admin read contract'
);

rollback;
