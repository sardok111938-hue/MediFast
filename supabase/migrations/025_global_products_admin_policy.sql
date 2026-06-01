create table if not exists public.global_products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.global_products enable row level security;

drop policy if exists "Admins can manage global products"
on public.global_products;

create policy "Admins can manage global products"
on public.global_products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.global_products to anon, authenticated;
grant insert, update, delete on public.global_products to authenticated;

create or replace view public.products_with_global_images as
select
  p.*,
  coalesce(p.image_url, gp.image_url) as display_image_url,
  gp.image_url as global_image_url
from public.products p
left join public.global_products gp
  on gp.barcode = p.barcode;

grant select on public.products_with_global_images to anon, authenticated;

notify pgrst, 'reload schema';

-- Read/display products -> products_with_global_images
-- Write/edit products -> products
-- Global image save -> global_products via admin only