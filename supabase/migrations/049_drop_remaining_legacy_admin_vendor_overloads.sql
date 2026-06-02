drop function if exists public.admin_create_vendor(
  uuid, text, text, text, text, text, text, text, numeric, numeric, text, boolean
);

drop function if exists public.admin_update_vendor(
  uuid, uuid, text, text, text, text, text, text, text, numeric, numeric, boolean, boolean, text, boolean
);
