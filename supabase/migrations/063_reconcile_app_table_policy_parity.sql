grant update on table public.customers to authenticated;
grant update on table public.orders to authenticated;

drop policy if exists "Admins can read categories" on public.categories;
create policy "Admins can read categories"
on public.categories
for select
to authenticated
using (public.is_admin());

drop policy if exists "Vendors can read categories" on public.categories;
create policy "Vendors can read categories"
on public.categories
for select
to authenticated
using (public.get_vendor_id() is not null);

drop policy if exists "Admins can read drivers" on public.drivers;
create policy "Admins can read drivers"
on public.drivers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update drivers" on public.drivers;
create policy "Admins can update drivers"
on public.drivers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Drivers can read their own record" on public.drivers;
create policy "Drivers can read their own record"
on public.drivers
for select
to authenticated
using (
  user_id = (
    select p.id
    from public.profiles p
    where p.auth_user_id = auth.uid()
  )
);

drop policy if exists "Drivers can update own editable profile" on public.drivers;
create policy "Drivers can update own editable profile"
on public.drivers
for update
to authenticated
using (
  user_id = (
    select p.id
    from public.profiles p
    where p.auth_user_id = auth.uid()
  )
)
with check (
  user_id = (
    select p.id
    from public.profiles p
    where p.auth_user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert platform settings" on public.platform_settings;
create policy "Admins can insert platform settings"
on public.platform_settings
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can read platform settings" on public.platform_settings;
create policy "Admins can read platform settings"
on public.platform_settings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update platform settings" on public.platform_settings;
create policy "Admins can update platform settings"
on public.platform_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read platform settings" on public.platform_settings;
create policy "Authenticated users can read platform settings"
on public.platform_settings
for select
to authenticated
using (true);

drop policy if exists "Admins can read product_images" on public.product_images;
create policy "Admins can read product_images"
on public.product_images
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can read products" on public.products;
create policy "Admins can read products"
on public.products
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Vendors can insert own products" on public.products;
create policy "Vendors can insert own products"
on public.products
for insert
to authenticated
with check (vendor_id = public.get_vendor_id());

drop policy if exists "Vendors can read own products" on public.products;
create policy "Vendors can read own products"
on public.products
for select
to authenticated
using (vendor_id = public.get_vendor_id());

drop policy if exists "Vendors can update own products" on public.products;
create policy "Vendors can update own products"
on public.products
for update
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());

drop policy if exists "Vendors manage own products" on public.products;
create policy "Vendors manage own products"
on public.products
for all
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "drivers can read customer profile rows for visible orders by pr" on public.profiles;
create policy "drivers can read customer profile rows for visible orders by pr"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.user_id = profiles.id
      and (
        o.driver_id = public.get_driver_id()
        or (
          o.order_status = 'ready_for_pickup'::public.order_status
          and o.driver_id is null
        )
      )
  )
);

drop policy if exists "drivers can read customer profiles for visible orders" on public.profiles;
create policy "drivers can read customer profiles for visible orders"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where c.user_id = profiles.auth_user_id
      and (
        o.driver_id = public.get_driver_id()
        or (
          o.order_status = 'ready_for_pickup'::public.order_status
          and o.driver_id is null
        )
      )
  )
);

drop policy if exists "vendors can read prescription request profiles" on public.profiles;
create policy "vendors can read prescription request profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.customers c
    join public.prescription_requests pr on pr.customer_id = c.id
    where c.user_id = profiles.id
      and pr.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "Admins can read vendors" on public.vendors;
create policy "Admins can read vendors"
on public.vendors
for select
to authenticated
using (public.is_admin());

drop policy if exists "drivers can read vendors for visible orders" on public.vendors;
create policy "drivers can read vendors for visible orders"
on public.vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.vendor_id = vendors.id
      and (
        o.driver_id = public.get_driver_id()
        or (
          o.order_status = 'ready_for_pickup'::public.order_status
          and o.driver_id is null
        )
      )
  )
);
