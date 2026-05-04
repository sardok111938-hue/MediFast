create extension if not exists "pgcrypto";

create type public.user_role as enum ('customer', 'driver', 'vendor', 'admin');
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.payment_method as enum ('cash_on_delivery');
create type public.payment_status as enum ('pending', 'collected');
create type public.order_status as enum (
  'placed',
  'accepted',
  'rejected',
  'ready_for_pickup',
  'assigned',
  'arrived_at_pharmacy',
  'picked_up',
  'on_the_way',
  'delivered'
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  full_name text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  default_address_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  is_available boolean not null default false,
  current_lat numeric(10, 7),
  current_lng numeric(10, 7),
  approval_status public.approval_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text unique,
  description text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  area text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  approval_status public.approval_status not null default 'pending',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0,
  image_url text,
  barcode text,
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null,
  line_1 text not null,
  line_2 text,
  city text not null,
  area text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  created_at timestamptz not null default now()
);

alter table public.customers
  add constraint customers_default_address_fk
  foreign key (default_address_id) references public.addresses(id) on delete set null;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  driver_id uuid references public.drivers(id) on delete set null,
  subtotal numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_method public.payment_method not null default 'cash_on_delivery',
  payment_status public.payment_status not null default 'pending',
  order_status public.order_status not null default 'placed',
  delivery_address_id uuid not null references public.addresses(id) on delete restrict,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 0,
  total_price numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  lat numeric(10, 7),
  lng numeric(10, 7),
  status public.order_status not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'percent',
  discount_value numeric(10, 2) not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_vendor on public.products(vendor_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_vendor on public.orders(vendor_id);
create index if not exists idx_orders_driver on public.orders(driver_id);
create index if not exists idx_orders_status on public.orders(order_status);
create index if not exists idx_delivery_tracking_order on public.delivery_tracking(order_id, recorded_at desc);

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.delivery_tracking;
alter publication supabase_realtime add table public.drivers;
