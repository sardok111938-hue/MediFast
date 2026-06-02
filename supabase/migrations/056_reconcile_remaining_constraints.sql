alter table public.notifications
  drop constraint if exists notifications_order_id_fkey;

drop index if exists public.notifications_order_idx;

alter table public.prescription_quotes
  drop constraint if exists prescription_quotes_vendor_id_fkey;

alter table public.prescription_quotes
  drop constraint if exists prescription_quotes_subtotal_check;

alter table public.vendors
  drop constraint if exists vendors_user_id_key;

alter table public.prescription_quotes
  add constraint prescription_quotes_subtotal_check
  check (subtotal >= 0);

alter table public.vendors
  add constraint vendors_user_id_key
  unique (user_id);

alter table public.prescription_quotes
  add constraint prescription_quotes_vendor_id_fkey
  foreign key (vendor_id)
  references public.vendors(id)
  on delete cascade;

create index if not exists notifications_order_idx
on public.notifications(order_id, created_at desc);