begin;

select public.test_assert(
  to_regprocedure(
    'public.register_vendor_account(text,text,text,text,text,text,text,text)'
  ) is null,
  'obsolete 8-argument register_vendor_account overload is absent'
);

select public.test_assert(
  to_regprocedure(
    'public.vendor_update_settings(text,text,text,text,text,text,text)'
  ) is null,
  'obsolete 7-argument vendor_update_settings overload is absent'
);

select public.test_assert(
  to_regprocedure(
    'public.register_vendor_account(text,text,text,text,text,text,text,text,text,text)'
  ) is not null,
  'current 10-argument register_vendor_account remains'
);

select public.test_assert(
  to_regprocedure(
    'public.vendor_update_settings(text,text,text,text,text,text,text,numeric,numeric,numeric)'
  ) is not null,
  'current 10-argument vendor_update_settings remains'
);

select public.test_assert(
  not has_function_privilege(
    'anon',
    'public.register_vendor_account(text,text,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ),
  'current register_vendor_account remains unavailable to anon'
);

select public.test_assert(
  has_function_privilege(
    'authenticated',
    'public.register_vendor_account(text,text,text,text,text,text,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated retains register_vendor_account execution'
);

select public.test_assert(
  not has_function_privilege(
    'anon',
    'public.vendor_update_settings(text,text,text,text,text,text,text,numeric,numeric,numeric)',
    'EXECUTE'
  ),
  'current vendor_update_settings remains unavailable to anon'
);

select public.test_assert(
  has_function_privilege(
    'authenticated',
    'public.vendor_update_settings(text,text,text,text,text,text,text,numeric,numeric,numeric)',
    'EXECUTE'
  ),
  'authenticated retains vendor_update_settings execution'
);

select public.test_pass(
  'obsolete vendor account RPC overload cleanup'
);

rollback;
