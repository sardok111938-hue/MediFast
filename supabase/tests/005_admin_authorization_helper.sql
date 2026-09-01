begin;

select test_assert(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) ilike '%is_current_user_admin%'
  ),
  'no public function references legacy is_current_user_admin helper'
);

select test_assert(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_admin'
      and p.prokind = 'f'
      and p.prosecdef
      and coalesce(
        array_to_string(p.proconfig, ','),
        ''
      ) ilike '%row_security=off%'
  ),
  'is_admin is SECURITY DEFINER with row_security off'
);

select test_pass('admin authorization helper contract');

rollback;
