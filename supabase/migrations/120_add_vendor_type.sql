-- Add the first merchant-type discriminator for Libyani expansion.
--
-- Preserve the existing physical vendors/vendor_id model.
-- Existing vendors and legacy vendor creation flows default to pharmacy.

alter table public.vendors
  add column vendor_type text not null default 'pharmacy';

alter table public.vendors
  add constraint vendors_vendor_type_check
  check (
    vendor_type in (
      'pharmacy',
      'grocery',
      'restaurant',
      'shop',
      'home_business',
      'water_supplier'
    )
  );
