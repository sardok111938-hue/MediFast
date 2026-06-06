-- Lock driver profile/document uploads to the authenticated driver's own folder.
-- Expected object path:
-- drivers/{driver_id}/profile_image_url-*.jpg
-- drivers/{driver_id}/passport_image_url-*.jpg
-- drivers/{driver_id}/vehicle_image_url-*.jpg

drop policy if exists "Drivers can upload own profile images" on storage.objects;
drop policy if exists "Drivers can update own profile images" on storage.objects;
drop policy if exists "authenticated users can upload driver profile images" on storage.objects;
drop policy if exists "authenticated users can update driver profile images" on storage.objects;

create policy "Drivers can upload own driver profile files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'driver-profiles'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = public.get_driver_id()::text
);

create policy "Drivers can update own driver profile files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'driver-profiles'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = public.get_driver_id()::text
)
with check (
  bucket_id = 'driver-profiles'
  and (storage.foldername(name))[1] = 'drivers'
  and (storage.foldername(name))[2] = public.get_driver_id()::text
);
