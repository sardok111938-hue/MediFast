begin;

select public.test_assert(
  to_regprocedure(
    'public.admin_create_vendor(uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,boolean)'
  ) is null,
  'obsolete admin_create_vendor signature is absent'
);

select public.test_assert(
  to_regprocedure(
    'public.admin_create_vendor(uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,boolean,text)'
  ) is not null,
  'admin_create_vendor exposes trailing vendor_type'
);

select public.test_assert(
  to_regprocedure(
    'public.admin_update_vendor(uuid,uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,boolean,boolean,text,boolean)'
  ) is null,
  'obsolete admin_update_vendor signature is absent'
);

select public.test_assert(
  to_regprocedure(
    'public.admin_update_vendor(uuid,uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,boolean,boolean,text,boolean,text)'
  ) is not null,
  'admin_update_vendor exposes trailing vendor_type'
);

select public.test_assert(
  (
    select p.proargnames[array_length(p.proargnames, 1)]
    from pg_proc p
    where p.oid =
      'public.admin_create_vendor(uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,boolean,text)'::regprocedure
  ) = 'p_vendor_type',
  'admin_create_vendor vendor_type parameter is trailing'
);

select public.test_assert(
  (
    select p.pronargdefaults
    from pg_proc p
    where p.oid =
      'public.admin_create_vendor(uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,boolean,text)'::regprocedure
  ) = 17,
  'admin_create_vendor keeps all arguments defaulted'
);

select public.test_assert(
  (
    select p.proargnames[array_length(p.proargnames, 1)]
    from pg_proc p
    where p.oid =
      'public.admin_update_vendor(uuid,uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,boolean,boolean,text,boolean,text)'::regprocedure
  ) = 'p_vendor_type',
  'admin_update_vendor vendor_type parameter is trailing'
);

select public.test_assert(
  (
    select p.pronargdefaults
    from pg_proc p
    where p.oid =
      'public.admin_update_vendor(uuid,uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,boolean,boolean,text,boolean,text)'::regprocedure
  ) = 19,
  'admin_update_vendor keeps every argument after vendor_id defaulted'
);

select public.test_assert(
  position(
    'vendor_type'
    in lower(
      pg_get_functiondef(
        'public.admin_create_vendor(uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,text,boolean,text)'::regprocedure
      )
    )
  ) > 0,
  'admin_create_vendor writes vendor_type'
);

select public.test_assert(
  position(
    'vendor_type'
    in lower(
      pg_get_functiondef(
        'public.admin_update_vendor(uuid,uuid,text,text,text,text,text,text,text,text,text,text,numeric,numeric,numeric,boolean,boolean,text,boolean,text)'::regprocedure
      )
    )
  ) > 0,
  'admin_update_vendor writes vendor_type'
);

select public.test_pass(
  'admin vendor type write contract'
);

rollback;
