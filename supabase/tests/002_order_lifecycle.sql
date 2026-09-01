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
      and e.enumlabel = 'picked_up'
  ),
  'picked_up status exists'
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

select public.test_assert(
  position(
    'old.order_status = ''assigned'' and new.order_status = ''picked_up'''
    in regexp_replace(
      pg_get_functiondef(
        'public.enforce_order_lifecycle_update()'::regprocedure
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  ) > 0,
  'lifecycle trigger allows assigned -> picked_up'
);

select public.test_assert(
  position(
    'old.order_status = ''picked_up'' and new.order_status = ''on_the_way'''
    in regexp_replace(
      pg_get_functiondef(
        'public.enforce_order_lifecycle_update()'::regprocedure
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  ) > 0,
  'lifecycle trigger allows picked_up -> on_the_way'
);

select public.test_assert(
  position(
    'old.order_status = ''assigned'' and new.order_status = ''on_the_way'''
    in regexp_replace(
      pg_get_functiondef(
        'public.enforce_order_lifecycle_update()'::regprocedure
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  ) = 0,
  'lifecycle trigger rejects obsolete assigned -> on_the_way shortcut'
);

select public.test_pass('order lifecycle contract');

rollback;
