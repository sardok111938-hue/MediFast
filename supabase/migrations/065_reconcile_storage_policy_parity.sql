drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects
for update
to authenticated
using (((bucket_id = 'product-images'::text) AND public.is_admin()));

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects
for insert
to authenticated
with check (((bucket_id = 'product-images'::text) AND public.is_admin()));

drop policy if exists "Anyone can view driver profile images" on storage.objects;
create policy "Anyone can view driver profile images"
on storage.objects
for select
to public
using ((bucket_id = 'driver-profiles'::text));

drop policy if exists "Drivers can update own profile images" on storage.objects;
create policy "Drivers can update own profile images"
on storage.objects
for update
to authenticated
using (((bucket_id = 'driver-profiles'::text) AND (name ~~ 'drivers/%'::text)))
with check (((bucket_id = 'driver-profiles'::text) AND (name ~~ 'drivers/%'::text)));

drop policy if exists "Drivers can upload own profile images" on storage.objects;
create policy "Drivers can upload own profile images"
on storage.objects
for insert
to authenticated
with check (((bucket_id = 'driver-profiles'::text) AND (name ~~ 'drivers/%'::text)));

drop policy if exists "Public can read product images" on storage.objects;
create policy "Public can read product images"
on storage.objects
for select
to public
using ((bucket_id = 'product-images'::text));

drop policy if exists "Vendors can update own product images" on storage.objects;
create policy "Vendors can update own product images"
on storage.objects
for update
to authenticated
using (((bucket_id = 'product-images'::text) AND (public.get_vendor_id() IS NOT NULL)))
with check (((bucket_id = 'product-images'::text) AND (public.get_vendor_id() IS NOT NULL)));

drop policy if exists "Vendors can upload own product images" on storage.objects;
create policy "Vendors can upload own product images"
on storage.objects
for insert
to authenticated
with check (((bucket_id = 'product-images'::text) AND (public.get_vendor_id() IS NOT NULL)));

drop policy if exists "admins can delete vendor images" on storage.objects;
create policy "admins can delete vendor images"
on storage.objects
for delete
to authenticated
using (((bucket_id = 'vendor-images'::text) AND public.is_admin()));

drop policy if exists "admins can update vendor images" on storage.objects;
create policy "admins can update vendor images"
on storage.objects
for update
to authenticated
using (((bucket_id = 'vendor-images'::text) AND public.is_admin()))
with check (((bucket_id = 'vendor-images'::text) AND public.is_admin()));

drop policy if exists "admins can upload vendor images" on storage.objects;
create policy "admins can upload vendor images"
on storage.objects
for insert
to authenticated
with check (((bucket_id = 'vendor-images'::text) AND public.is_admin()));

drop policy if exists "customers can upload own prescription files" on storage.objects;
create policy "customers can upload own prescription files"
on storage.objects
for insert
to authenticated
with check (((bucket_id = 'prescriptions'::text) AND ((storage.foldername(name))[1] = (public.get_customer_id())::text)));

drop policy if exists "customers can view own prescription files" on storage.objects;
create policy "customers can view own prescription files"
on storage.objects
for select
to authenticated
using (((bucket_id = 'prescriptions'::text) AND ((storage.foldername(name))[1] = (public.get_customer_id())::text)));

drop policy if exists "vendors can read vendor images" on storage.objects;
create policy "vendors can read vendor images"
on storage.objects
for select
to public
using ((bucket_id = 'vendor-images'::text));

drop policy if exists "vendors can update own vendor images" on storage.objects;
create policy "vendors can update own vendor images"
on storage.objects
for update
to authenticated
using (((bucket_id = 'vendor-images'::text) AND (public.get_vendor_id() IS NOT NULL)))
with check (((bucket_id = 'vendor-images'::text) AND (public.get_vendor_id() IS NOT NULL)));

drop policy if exists "vendors can upload own vendor images" on storage.objects;
create policy "vendors can upload own vendor images"
on storage.objects
for insert
to authenticated
with check (((bucket_id = 'vendor-images'::text) AND (public.get_vendor_id() IS NOT NULL)));

drop policy if exists "vendors can view assigned prescription files" on storage.objects;
create policy "vendors can view assigned prescription files"
on storage.objects
for select
to authenticated
using (((bucket_id = 'prescriptions'::text) AND (EXISTS (
  SELECT 1
  FROM public.prescription_requests pr
  WHERE ((pr.image_path = objects.name) AND (pr.vendor_id = public.get_vendor_id()))
))));
