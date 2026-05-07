create or replace function public.get_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select v.id
  from public.vendors v
  join public.profiles p on p.id = v.user_id
  where p.auth_user_id = auth.uid()
  order by v.created_at asc, v.id asc
  limit 1;
$$;

grant execute on function public.get_vendor_id() to authenticated;

do $$
begin
  if exists (
    select 1
    from public.vendors v
    where v.user_id is not null
    group by v.user_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce vendor ownership integrity: duplicate vendors.user_id values exist.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'vendors_user_id_unique_nonnull'
  ) then
    create unique index vendors_user_id_unique_nonnull
      on public.vendors (user_id)
      where user_id is not null;
  end if;
end;
$$;
