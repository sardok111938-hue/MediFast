begin;

-- Anonymous clients must have no direct table privileges on orders.
select public.test_assert(
  not has_table_privilege(
    'anon',
    'public.orders',
    'SELECT'
  ),
  'anon cannot select orders'
);

select public.test_assert(
  not has_table_privilege(
    'anon',
    'public.orders',
    'INSERT'
  ),
  'anon cannot insert orders'
);

select public.test_assert(
  not has_table_privilege(
    'anon',
    'public.orders',
    'UPDATE'
  ),
  'anon cannot update orders'
);

select public.test_assert(
  not has_table_privilege(
    'anon',
    'public.orders',
    'DELETE'
  ),
  'anon cannot delete orders'
);

-- Authenticated application clients are read-only at table level.
select public.test_assert(
  has_table_privilege(
    'authenticated',
    'public.orders',
    'SELECT'
  ),
  'authenticated can select orders'
);

select public.test_assert(
  not has_table_privilege(
    'authenticated',
    'public.orders',
    'INSERT'
  ),
  'authenticated cannot directly insert orders'
);

select public.test_assert(
  not has_table_privilege(
    'authenticated',
    'public.orders',
    'UPDATE'
  ),
  'authenticated cannot directly update orders'
);

select public.test_assert(
  not has_table_privilege(
    'authenticated',
    'public.orders',
    'DELETE'
  ),
  'authenticated cannot directly delete orders'
);

-- Catch non-DML privilege drift too.
select public.test_assert(
  not exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'orders'
      and g.grantee = 'authenticated'
      and g.privilege_type <> 'SELECT'
  ),
  'authenticated has SELECT only on orders'
);

select public.test_assert(
  not exists (
    select 1
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.table_name = 'orders'
      and g.grantee = 'anon'
  ),
  'anon has no orders table privileges'
);

-- service_role remains trusted.
select public.test_assert(
  has_table_privilege(
    'service_role',
    'public.orders',
    'SELECT,INSERT,UPDATE,DELETE'
  ),
  'service_role retains order DML privileges'
);

select public.test_pass(
  'orders table privilege baseline'
);

rollback;
