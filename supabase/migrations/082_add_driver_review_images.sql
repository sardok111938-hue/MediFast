alter table public.drivers
add column if not exists passport_image_url text,
add column if not exists vehicle_image_url text;