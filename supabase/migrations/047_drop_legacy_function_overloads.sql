drop function if exists public.admin_create_vendor(
  uuid, text, text, text, text, text, text, numeric, numeric, text, boolean
);

drop function if exists public.admin_search_profiles(text, text);

drop function if exists public.admin_update_vendor(
  uuid, uuid, text, text, text, text, text, text, numeric, numeric, boolean, boolean, text, boolean
);

drop function if exists public.is_current_user_admin();

drop function if exists public.vendor_create_product(
  uuid, text, text, text, numeric, integer
);

drop function if exists public.vendor_update_product(
  uuid, text, text, numeric, uuid, boolean, text, boolean, integer
);

drop function if exists public.admin_list_vendors();

drop function if exists public.admin_update_order_status(uuid, text);
