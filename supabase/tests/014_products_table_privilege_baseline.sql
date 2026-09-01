begin;

select public.test_assert(
  not has_table_privilege('anon', 'public.products', 'SELECT'),
  'anon cannot SELECT products directly'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.products', 'INSERT'),
  'anon cannot INSERT products directly'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.products', 'UPDATE'),
  'anon cannot UPDATE products directly'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.products', 'DELETE'),
  'anon cannot DELETE products directly'
);

select public.test_assert(
  has_table_privilege('authenticated', 'public.products', 'SELECT'),
  'authenticated can SELECT products'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.products', 'INSERT'),
  'authenticated cannot INSERT products directly'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.products', 'UPDATE'),
  'authenticated cannot UPDATE products directly'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.products', 'DELETE'),
  'authenticated cannot DELETE products directly'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.products', 'SELECT'),
  'service_role can SELECT products'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.products', 'INSERT'),
  'service_role can INSERT products'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.products', 'UPDATE'),
  'service_role can UPDATE products'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.products', 'DELETE'),
  'service_role can DELETE products'
);

select public.test_assert(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'products'
      and grantee = 'anon'
  ),
  'anon has no direct products table grants'
);

select public.test_assert(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'products'
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
  ),
  'authenticated has no products privilege except SELECT'
);

select public.test_assert(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'products has no direct authenticated write policies'
);

select public.test_assert(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and cmd = 'SELECT'
  ),
  'products SELECT policies remain'
);

select public.test_pass(
  'products table privilege baseline'
);

rollback;
