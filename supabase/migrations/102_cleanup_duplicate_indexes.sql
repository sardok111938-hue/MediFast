drop index if exists public.categories_slug_unique_idx;
drop index if exists public.idx_prescription_quote_items_quote;
drop index if exists public.idx_prescription_quotes_customer;
drop index if exists public.idx_prescription_quotes_vendor;

create index if not exists orders_customer_status_created_idx
on public.orders (customer_id, order_status, created_at desc);

create index if not exists orders_vendor_status_created_idx
on public.orders (vendor_id, order_status, created_at desc);

create index if not exists orders_driver_status_created_idx
on public.orders (driver_id, order_status, created_at desc);