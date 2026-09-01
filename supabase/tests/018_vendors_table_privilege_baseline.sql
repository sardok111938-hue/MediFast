begin;

select public.test_assert(
  has_table_privilege('authenticated', 'public.vendors', 'SELECT'),
  'authenticated retains SELECT on vendors'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.vendors', 'INSERT'),
  'authenticated cannot directly INSERT vendors'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.vendors', 'UPDATE'),
  'authenticated cannot directly UPDATE vendors'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.vendors', 'DELETE'),
  'authenticated cannot directly DELETE vendors'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.vendors', 'SELECT'),
  'anon cannot directly SELECT vendors'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.vendors', 'INSERT'),
  'anon cannot directly INSERT vendors'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.vendors', 'UPDATE'),
  'anon cannot directly UPDATE vendors'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.vendors', 'DELETE'),
  'anon cannot directly DELETE vendors'
);

select public.test_assert(
  (
    select relrowsecurity
    from pg_class
    where oid = 'public.vendors'::regclass
  ),
  'vendors RLS remains enabled'
);

select public.test_assert(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vendors'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'vendors has no direct client write policies'
);

select public.test_pass(
  'vendors table privilege baseline'
);

rollback;
