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

notify pgrst, 'reload schema';

Read/display products → products_with_global_images
Write/edit products → products
Global image save → global_products via admin only