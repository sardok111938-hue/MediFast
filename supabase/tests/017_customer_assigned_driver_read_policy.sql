begin;

select public.test_assert(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'drivers'
      and policyname = 'Customers can read assigned driver for own orders'
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
  ),
  'customer assigned-driver SELECT policy exists for authenticated users'
);

select public.test_assert(
  (
    select qual ilike '%get_customer_id%'
       and qual ilike '%driver_id%'
       and qual ilike '%customer_id%'
    from pg_policies
    where schemaname = 'public'
      and tablename = 'drivers'
      and policyname = 'Customers can read assigned driver for own orders'
  ),
  'customer assigned-driver policy scopes access through own orders'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.drivers', 'SELECT'),
  'anon cannot SELECT drivers directly'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.drivers', 'INSERT'),
  'anon cannot INSERT drivers directly'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.drivers', 'UPDATE'),
  'anon cannot UPDATE drivers directly'
);

select public.test_assert(
  not has_table_privilege('anon', 'public.drivers', 'DELETE'),
  'anon cannot DELETE drivers directly'
);

select public.test_assert(
  has_table_privilege('authenticated', 'public.drivers', 'SELECT'),
  'authenticated can SELECT drivers through RLS'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.drivers', 'INSERT'),
  'authenticated cannot INSERT drivers directly'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.drivers', 'UPDATE'),
  'authenticated has no table-wide UPDATE on drivers'
);

select public.test_assert(
  not has_table_privilege('authenticated', 'public.drivers', 'DELETE'),
  'authenticated cannot DELETE drivers directly'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'current_lat', 'UPDATE'),
  'authenticated can update driver current_lat'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'current_lng', 'UPDATE'),
  'authenticated can update driver current_lng'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'expo_push_token', 'UPDATE'),
  'authenticated can update driver expo_push_token'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'emergency_contact_name', 'UPDATE'),
  'authenticated can update driver emergency_contact_name'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'emergency_contact_phone', 'UPDATE'),
  'authenticated can update driver emergency_contact_phone'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'profile_image_url', 'UPDATE'),
  'authenticated can update driver profile_image_url'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'passport_image_path', 'UPDATE'),
  'authenticated can update driver passport_image_path'
);

select public.test_assert(
  has_column_privilege('authenticated', 'public.drivers', 'vehicle_image_path', 'UPDATE'),
  'authenticated can update driver vehicle_image_path'
);

select public.test_assert(
  not has_column_privilege('authenticated', 'public.drivers', 'approval_status', 'UPDATE'),
  'authenticated cannot directly update driver approval_status'
);

select public.test_assert(
  not has_column_privilege('authenticated', 'public.drivers', 'is_available', 'UPDATE'),
  'authenticated cannot directly update driver is_available'
);

select public.test_assert(
  not has_column_privilege('authenticated', 'public.drivers', 'rating', 'UPDATE'),
  'authenticated cannot directly update driver rating'
);

select public.test_assert(
  not has_column_privilege('authenticated', 'public.drivers', 'rating_count', 'UPDATE'),
  'authenticated cannot directly update driver rating_count'
);

select public.test_assert(
  not has_column_privilege('authenticated', 'public.drivers', 'total_deliveries', 'UPDATE'),
  'authenticated cannot directly update driver total_deliveries'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.drivers', 'SELECT'),
  'service_role can SELECT drivers'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.drivers', 'INSERT'),
  'service_role can INSERT drivers'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.drivers', 'UPDATE'),
  'service_role can UPDATE drivers'
);

select public.test_assert(
  has_table_privilege('service_role', 'public.drivers', 'DELETE'),
  'service_role can DELETE drivers'
);

select public.test_assert(
  not has_function_privilege(
    'anon',
    'public.admin_update_driver(uuid,text,boolean)',
    'EXECUTE'
  ),
  'anon cannot execute admin_update_driver'
);

select public.test_assert(
  has_function_privilege(
    'authenticated',
    'public.admin_update_driver(uuid,text,boolean)',
    'EXECUTE'
  ),
  'authenticated can execute admin_update_driver'
);

select public.test_assert(
  has_function_privilege(
    'service_role',
    'public.admin_update_driver(uuid,text,boolean)',
    'EXECUTE'
  ),
  'service_role can execute admin_update_driver'
);

select public.test_pass(
  'drivers access boundary and customer assigned-driver read policy'
);

rollback;
