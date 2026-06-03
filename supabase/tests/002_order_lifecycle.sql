begin;

select public.test_assert(
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'orders'
      and t.tgname = 'enforce_order_lifecycle_update'
      and not t.tgisinternal
  ),
  'orders lifecycle trigger exists'
);

select public.test_assert(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enforce_order_lifecycle_update'
  ),
  'enforce_order_lifecycle_update function exists'
);

select public.test_assert(
  exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'order_status'
      and e.enumlabel = 'ready_for_pickup'
  ),
  'ready_for_pickup status exists'
);

select public.test_assert(
  exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'order_status'
      and e.enumlabel = 'delivered'
  ),
  'delivered status exists'
);

select public.test_pass('order lifecycle contract');

rollback;
