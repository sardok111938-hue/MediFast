begin;

select public.test_assert(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'driver_claim_order'
  ),
  'driver_claim_order RPC exists'
);

select public.test_assert(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_current_user_available_driver'
  ),
  'is_current_user_available_driver helper exists'
);

select public.test_assert(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'orders'
      and indexname = 'orders_ready_for_pickup_unassigned_idx'
  ),
  'ready_for_pickup unassigned orders index exists'
);

select public.test_assert(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
      and policyname = 'Drivers can read available pickup orders'
  ),
  'available drivers can select pickup-ready orders policy exists'
);

select public.test_pass('driver claim flow contract');

rollback;
