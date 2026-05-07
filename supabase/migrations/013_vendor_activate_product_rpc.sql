create or replace function public.vendor_activate_product(
  p_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  resolved_product_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  if p_product_id is null then
    raise exception 'Product is required.';
  end if;

  update public.products
  set is_active = true
  where id = p_product_id
    and vendor_id = current_vendor_id
  returning id into resolved_product_id;

  if resolved_product_id is null then
    raise exception 'Product was not found for this vendor.';
  end if;

  return resolved_product_id;
end;
$$;

grant execute on function public.vendor_activate_product(uuid) to authenticated;
