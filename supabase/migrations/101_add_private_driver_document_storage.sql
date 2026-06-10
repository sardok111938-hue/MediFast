alter table drivers
add column if not exists passport_image_path text,
add column if not exists vehicle_image_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'driver-documents',
  'driver-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Drivers can upload own driver documents"
on storage.objects;

create policy "Drivers can upload own driver documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = get_driver_id()::text
);

drop policy if exists "Drivers can update own driver documents"
on storage.objects;

create policy "Drivers can update own driver documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = get_driver_id()::text
)
with check (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = get_driver_id()::text
);

drop policy if exists "Drivers can view own driver documents"
on storage.objects;

create policy "Drivers can view own driver documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'driver-documents'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = get_driver_id()::text
);

drop policy if exists "Admins can view driver documents"
on storage.objects;

create policy "Admins can view driver documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'driver-documents'
  and is_admin()
);