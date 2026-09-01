-- Remove obsolete vendor account/settings RPC overloads.
--
-- Current application callers use:
--   register_vendor_account(... 10 arguments ...)
--   vendor_update_settings(... 10 arguments ...)
--
-- Keep those authoritative signatures unchanged.

drop function if exists public.register_vendor_account(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);

drop function if exists public.vendor_update_settings(
  text,
  text,
  text,
  text,
  text,
  text,
  text
);
