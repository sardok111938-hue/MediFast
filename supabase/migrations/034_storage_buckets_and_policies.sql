insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('vendor-images', 'vendor-images', true),
  ('driver-profiles', 'driver-profiles', true),
  ('prescriptions', 'prescriptions', false)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "public can read product images" on storage.objects;
create policy "public can read product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

drop policy if exists "authenticated users can upload product images" on storage.objects;
create policy "authenticated users can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "authenticated users can update product images" on storage.objects;
create policy "authenticated users can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

drop policy if exists "public can read vendor images" on storage.objects;
create policy "public can read vendor images"
on storage.objects
for select
to public
using (bucket_id = 'vendor-images');

drop policy if exists "authenticated users can upload vendor images" on storage.objects;
create policy "authenticated users can upload vendor images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'vendor-images');

drop policy if exists "authenticated users can update vendor images" on storage.objects;
create policy "authenticated users can update vendor images"
on storage.objects
for update
to authenticated
using (bucket_id = 'vendor-images')
with check (bucket_id = 'vendor-images');

drop policy if exists "public can read driver profile images" on storage.objects;
create policy "public can read driver profile images"
on storage.objects
for select
to public
using (bucket_id = 'driver-profiles');

drop policy if exists "authenticated users can upload driver profile images" on storage.objects;
create policy "authenticated users can upload driver profile images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'driver-profiles');

drop policy if exists "authenticated users can update driver profile images" on storage.objects;
create policy "authenticated users can update driver profile images"
on storage.objects
for update
to authenticated
using (bucket_id = 'driver-profiles')
with check (bucket_id = 'driver-profiles');

drop policy if exists "authenticated users can upload prescriptions" on storage.objects;
create policy "authenticated users can upload prescriptions"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'prescriptions');

drop policy if exists "authenticated users can read prescriptions" on storage.objects;
create policy "authenticated users can read prescriptions"
on storage.objects
for select
to authenticated
using (bucket_id = 'prescriptions');