alter table public.global_products
  add column if not exists name_ar text,
  add column if not exists brand text,
  add column if not exists description text,
  add column if not exists category_slug text;

alter table public.global_products
  alter column barcode drop not null,
  alter column name set not null;

alter table public.global_products
  drop column if exists updated_at;

alter table public.cart_items enable row level security;
alter table public.carts enable row level security;
alter table public.coupons enable row level security;
alter table public.delivery_tracking enable row level security;
alter table public.drivers enable row level security;
alter table public.product_images enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;