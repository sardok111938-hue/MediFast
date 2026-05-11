alter table public.categories enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;

grant select on public.categories to authenticated;
grant select on public.vendors to authenticated;
grant select on public.products to authenticated;

drop policy if exists "authenticated users can select categories" on public.categories;
create policy "authenticated users can select categories"
on public.categories
for select
to authenticated
using (true);

drop policy if exists "admins can select all vendors" on public.vendors;
create policy "admins can select all vendors"
on public.vendors
for select
to authenticated
using (public.is_admin());

drop policy if exists "vendors can select own vendor profile" on public.vendors;
create policy "vendors can select own vendor profile"
on public.vendors
for select
to authenticated
using (id = public.get_vendor_id());

drop policy if exists "drivers can select vendors for assigned orders" on public.vendors;
create policy "drivers can select vendors for assigned orders"
on public.vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.vendor_id = public.vendors.id
      and o.driver_id = public.get_driver_id()
  )
);

drop policy if exists "authenticated users can select active approved vendors" on public.vendors;
create policy "authenticated users can select active approved vendors"
on public.vendors
for select
to authenticated
using (
  is_active = true
  and approval_status = 'approved'
);

drop policy if exists "admins can select all products" on public.products;
create policy "admins can select all products"
on public.products
for select
to authenticated
using (public.is_admin());

drop policy if exists "vendors can select own products" on public.products;
create policy "vendors can select own products"
on public.products
for select
to authenticated
using (vendor_id = public.get_vendor_id());

drop policy if exists "authenticated users can select sellable products" on public.products;
create policy "authenticated users can select sellable products"
on public.products
for select
to authenticated
using (
  is_active = true
  and stock_quantity > 0
  and exists (
    select 1
    from public.vendors v
    where v.id = public.products.vendor_id
      and v.is_active = true
      and v.approval_status = 'approved'
  )
);