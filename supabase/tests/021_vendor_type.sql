begin;

select public.test_assert(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vendors'
      and column_name = 'vendor_type'
      and data_type = 'text'
      and is_nullable = 'NO'
      and column_default = '''pharmacy''::text'
  ),
  'vendors.vendor_type exists as non-null text with pharmacy default'
);

select public.test_assert(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.vendors'::regclass
      and conname = 'vendors_vendor_type_check'
  ),
  'vendors vendor_type check constraint exists'
);

insert into public.vendors (
  name,
  slug
)
values (
  'Vendor Type Default Test',
  'vendor-type-default-test'
);

select public.test_assert(
  (
    select vendor_type = 'pharmacy'
    from public.vendors
    where slug = 'vendor-type-default-test'
  ),
  'new legacy-style vendors default to pharmacy'
);

do $$
begin
  begin
    insert into public.vendors (
      name,
      slug,
      vendor_type
    )
    values (
      'Invalid Vendor Type',
      'invalid-vendor-type-test',
      'invalid_type'
    );

    raise exception 'TEST FAILED: invalid vendor_type was accepted';
  exception
    when check_violation then
      null;
  end;
end;
$$;

select public.test_pass(
  'vendor type schema contract'
);

rollback;
