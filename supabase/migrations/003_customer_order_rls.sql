create or replace function public.get_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.customers c
  join public.profiles p on p.id = c.user_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.get_customer_id() to authenticated;

create policy "customers can select own orders"
on public.orders
for select
to authenticated
using (customer_id = public.get_customer_id());
