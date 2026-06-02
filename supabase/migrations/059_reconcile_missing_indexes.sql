create unique index if not exists categories_slug_unique_idx
on public.categories (slug)
where slug is not null;

create index if not exists notifications_recipient_idx
on public.notifications (recipient_role, recipient_id, created_at desc);

create unique index if not exists orders_prescription_quote_id_unique
on public.orders (prescription_quote_id)
where prescription_quote_id is not null;

create index if not exists prescription_quote_items_product_id_idx
on public.prescription_quote_items (product_id);

create index if not exists prescription_quote_items_quote_id_idx
on public.prescription_quote_items (quote_id);

create index if not exists prescription_quotes_customer_id_idx
on public.prescription_quotes (customer_id);

create unique index if not exists prescription_quotes_one_draft_per_request_vendor_idx
on public.prescription_quotes (prescription_request_id, vendor_id)
where status = 'draft';

create index if not exists prescription_quotes_request_id_idx
on public.prescription_quotes (prescription_request_id);

create index if not exists prescription_quotes_status_idx
on public.prescription_quotes (status);

create index if not exists prescription_quotes_vendor_id_idx
on public.prescription_quotes (vendor_id);

create unique index if not exists products_vendor_barcode_unique_idx
on public.products (vendor_id, barcode)
where barcode is not null;

create unique index if not exists vendors_contact_email_unique
on public.vendors (lower(trim(contact_email)))
where nullif(trim(contact_email), '') is not null;