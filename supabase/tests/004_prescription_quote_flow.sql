begin;

select public.test_assert(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'prescription_requests'
      and c.relkind = 'r'
  ),
  'prescription_requests table exists'
);

select public.test_assert(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'prescription_quotes'
      and c.relkind = 'r'
  ),
  'prescription_quotes table exists'
);

select public.test_assert(
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'prescription_quote_items'
      and c.relkind = 'r'
  ),
  'prescription_quote_items table exists'
);

select public.test_assert(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'vendor_create_prescription_quote'
  ),
  'vendor_create_prescription_quote RPC exists'
);

select public.test_assert(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'vendor_send_prescription_quote'
  ),
  'vendor_send_prescription_quote RPC exists'
);

select public.test_assert(
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'customer_respond_prescription_quote'
  ),
  'customer_respond_prescription_quote RPC exists'
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

select public.test_assert(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'prescription_requests'
      and indexname in (
        'prescription_requests_vendor_id_idx',
        'prescription_requests_vendor_id_created_at_desc_idx'
      )
  ),
  'prescription_requests vendor index exists'
);

select public.test_pass('prescription quote flow contract');

rollback;
