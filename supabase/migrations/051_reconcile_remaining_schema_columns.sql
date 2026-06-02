alter table public.drivers
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists profile_image_url text,
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_type text;

alter table public.products
  add column if not exists low_stock_threshold integer not null default 5;

alter table public.vendors
  add column if not exists contact_email text,
  add column if not exists license_number text,
  add column if not exists minimum_order_amount numeric not null default 0;

alter table public.vendors
  alter column delivery_radius_km set default 8,
  alter column delivery_radius_km set not null;

alter table public.orders
  add column if not exists accepted_at timestamp with time zone,
  add column if not exists assigned_at timestamp with time zone,
  add column if not exists arrived_at_pharmacy_at timestamp with time zone,
  add column if not exists picked_up_at timestamp with time zone,
  add column if not exists on_the_way_at timestamp with time zone,
  add column if not exists delivered_at timestamp with time zone,
  add column if not exists rejected_at timestamp with time zone,
  add column if not exists cancelled_at timestamp with time zone;

alter table public.order_items
  alter column product_id drop not null,
  alter column product_name set not null;

alter table public.prescription_requests
  add column if not exists note text,
  add column if not exists responded_at timestamp with time zone;

alter table public.prescription_quote_items
  alter column unit_price type numeric using unit_price::numeric,
  alter column line_total type numeric using line_total::numeric;

alter table public.prescription_quotes
  alter column subtotal type numeric using subtotal::numeric;

alter table public.orders
  alter column delivery_distance_km type numeric using delivery_distance_km::numeric;