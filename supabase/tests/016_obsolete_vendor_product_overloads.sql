begin;

select public.test_assert(
  to_regprocedure(
    'public.vendor_create_product(uuid,text,text,text,numeric,integer,integer)'
  ) is null,
  'obsolete 7-argument vendor_create_product overload is absent'
);

select public.test_assert(
  to_regprocedure(
    'public.vendor_update_product(uuid,text,text,numeric,uuid,boolean,text,boolean,integer,integer)'
  ) is null,
  'obsolete 10-argument vendor_update_product overload is absent'
);

select public.test_assert(
  to_regprocedure(
    'public.vendor_create_product(uuid,text,text,text,numeric,integer,integer,text)'
  ) is not null,
  'current barcode-aware vendor_create_product overload remains'
);

select public.test_assert(
  to_regprocedure(
    'public.vendor_update_product(uuid,text,text,numeric,uuid,boolean,text,boolean,integer,integer,text,boolean)'
  ) is not null,
  'current barcode-aware vendor_update_product overload remains'
);

select public.test_pass(
  'obsolete vendor product RPC overload cleanup'
);

rollback;
