begin;

-- authenticated must have no table-level UPDATE privilege.
select public.test_assert(
  not has_table_privilege(
    'authenticated',
    'public.orders',
    'UPDATE'
  ),
  'authenticated cannot directly update orders'
);

-- Historical column-level UPDATE grants must also be gone.
select public.test_assert(
  not has_column_privilege(
    'authenticated',
    'public.orders',
    'order_status',
    'UPDATE'
  ),
  'authenticated cannot directly update orders.order_status'
);

select public.test_assert(
  not has_column_privilege(
    'authenticated',
    'public.orders',
    'driver_id',
    'UPDATE'
  ),
  'authenticated cannot directly update orders.driver_id'
);

-- Migration 063 granted table-wide UPDATE, so verify no other order column
-- remains directly UPDATE-capable either.
select public.test_assert(
  not exists (
    select 1
    from information_schema.column_privileges cp
    where cp.table_schema = 'public'
      and cp.table_name = 'orders'
      and cp.grantee = 'authenticated'
      and cp.privilege_type = 'UPDATE'
  ),
  'authenticated has no direct UPDATE privilege on any orders column'
);

-- Direct mutation policies are intentionally removed. All legitimate order
-- mutations now cross dedicated RPC boundaries.
select public.test_assert(
  not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'orders'
      and p.cmd = 'UPDATE'
      and 'authenticated' = any (p.roles)
  ),
  'orders has no authenticated UPDATE RLS policies'
);

-- SELECT remains available; this migration hardens writes only.
select public.test_assert(
  has_table_privilege(
    'authenticated',
    'public.orders',
    'SELECT'
  ),
  'authenticated retains orders SELECT privilege'
);

select public.test_pass(
  'orders direct authenticated UPDATE access removed'
);

rollback;
