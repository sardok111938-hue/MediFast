begin;

select public.test_assert(
  to_regprocedure(
    'public.admin_apply_low_stock_threshold(integer)'
  ) is not null,
  'admin low-stock threshold RPC exists'
);

select public.test_assert(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid =
        'public.admin_apply_low_stock_threshold(integer)'::regprocedure
  ),
  'admin low-stock threshold RPC is SECURITY DEFINER'
);

select public.test_assert(
  not has_function_privilege(
    'anon',
    'public.admin_apply_low_stock_threshold(integer)',
    'EXECUTE'
  ),
  'anon cannot execute admin low-stock threshold RPC'
);

select public.test_assert(
  has_function_privilege(
    'authenticated',
    'public.admin_apply_low_stock_threshold(integer)',
    'EXECUTE'
  ),
  'authenticated may execute admin low-stock threshold RPC'
);

select public.test_assert(
  has_function_privilege(
    'service_role',
    'public.admin_apply_low_stock_threshold(integer)',
    'EXECUTE'
  ),
  'service_role may execute admin low-stock threshold RPC'
);

select public.test_pass(
  'product dashboard write RPC boundary'
);

rollback;
