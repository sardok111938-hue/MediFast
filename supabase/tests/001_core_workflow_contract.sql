begin;

select public.test_assert(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_cod_order'
  ),
  'create_cod_order RPC exists'
);

select public.test_assert(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'driver_claim_order'
  ),
  'driver_claim_order RPC exists'
);

select public.test_assert(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_cod_order_from_quote'
  ),
  'create_cod_order_from_quote RPC exists'
);

select public.test_pass('core workflow contract');

rollback;
