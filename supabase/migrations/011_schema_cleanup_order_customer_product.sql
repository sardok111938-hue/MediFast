alter type public.order_status add value if not exists 'preparing';
alter type public.order_status add value if not exists 'cancelled';

create or replace function public.get_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.customers c
  join public.profiles p
    on p.id = c.user_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_customer_id() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_user_id_unique'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_user_id_unique unique (user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_price_nonnegative'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_price_nonnegative
      check (price >= 0);
  end if;
end
$$;
