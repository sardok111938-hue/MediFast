do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'customer_favourite_vendors'
  ) then

    insert into public.customer_favorite_vendors (
      customer_id,
      vendor_id,
      created_at
    )
    select
      customer_id,
      vendor_id,
      created_at
    from public.customer_favourite_vendors
    on conflict (customer_id, vendor_id) do nothing;

    drop table public.customer_favourite_vendors cascade;
  end if;
end $$;