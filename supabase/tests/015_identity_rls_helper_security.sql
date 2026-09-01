begin;

select public.test_assert(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.get_customer_id()'::regprocedure
  ),
  'get_customer_id remains SECURITY DEFINER'
);

select public.test_assert(
  (
    select 'row_security=off' = any(coalesce(p.proconfig, array[]::text[]))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.get_customer_id()'::regprocedure
  ),
  'get_customer_id has row_security=off'
);

select public.test_assert(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.get_driver_id()'::regprocedure
  ),
  'get_driver_id remains SECURITY DEFINER'
);

select public.test_assert(
  (
    select 'row_security=off' = any(coalesce(p.proconfig, array[]::text[]))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.get_driver_id()'::regprocedure
  ),
  'get_driver_id has row_security=off'
);

select public.test_assert(
  (
    select p.prosecdef
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.get_vendor_id()'::regprocedure
  ),
  'get_vendor_id remains SECURITY DEFINER'
);

select public.test_assert(
  (
    select 'row_security=off' = any(coalesce(p.proconfig, array[]::text[]))
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid = 'public.get_vendor_id()'::regprocedure
  ),
  'get_vendor_id has row_security=off'
);

select public.test_pass(
  'identity RLS helper security'
);

rollback;
