alter table public.platform_settings
  drop column if exists description;

alter table public.platform_settings
  alter column value drop default;

alter table public.prescription_requests
  drop column if exists image_url,
  drop column if exists notes;

alter table public.vendor_operating_hours
  drop column if exists updated_at;