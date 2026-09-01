-- Remove legacy vendor product RPC overloads recreated by historical
-- reconciliation migrations.
--
-- The current barcode-aware RPC signatures remain authoritative.

drop function if exists public.vendor_create_product(
  uuid,
  text,
  text,
  text,
  numeric,
  integer,
  integer
);

drop function if exists public.vendor_update_product(
  uuid,
  text,
  text,
  numeric,
  uuid,
  boolean,
  text,
  boolean,
  integer,
  integer
);
