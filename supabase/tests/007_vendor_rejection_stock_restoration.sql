begin;

-- Fixed UUIDs keep the fixture deterministic and easy to inspect.
insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000002',
  'Vendor Rejection Test',
  'vendor'
);

insert into public.vendors (
  id,
  user_id,
  name,
  slug,
  approval_status,
  is_active
)
values (
  '70000000-0000-0000-0000-000000000003',
  '70000000-0000-0000-0000-000000000001',
  'Vendor Rejection Test',
  'vendor-rejection-test',
  'approved',
  true
);

insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values (
  '70000000-0000-0000-0000-000000000004',
  '70000000-0000-0000-0000-000000000005',
  'Customer Rejection Test',
  'customer'
);

insert into public.customers (
  id,
  user_id
)
values (
  '70000000-0000-0000-0000-000000000006',
  '70000000-0000-0000-0000-000000000004'
);

insert into public.addresses (
  id,
  customer_id,
  line_1
)
values (
  '70000000-0000-0000-0000-000000000007',
  '70000000-0000-0000-0000-000000000006',
  'Test address'
);

insert into public.products (
  id,
  vendor_id,
  name,
  price,
  stock_quantity,
  is_active
)
values (
  '70000000-0000-0000-0000-000000000008',
  '70000000-0000-0000-0000-000000000003',
  'Rejection stock test product',
  10.00,
  7,
  true
);

-- Represent an already-created order whose inventory reservation deducted
-- five units from an original stock level of 12.
insert into public.orders (
  id,
  customer_id,
  vendor_id,
  subtotal,
  delivery_fee,
  total,
  payment_method,
  payment_status,
  order_status,
  delivery_address_id
)
values (
  '70000000-0000-0000-0000-000000000009',
  '70000000-0000-0000-0000-000000000006',
  '70000000-0000-0000-0000-000000000003',
  50.00,
  0.00,
  50.00,
  'cash_on_delivery',
  'pending',
  'placed',
  '70000000-0000-0000-0000-000000000007'
);

-- Deliberately use duplicate product rows. order_items currently does not
-- enforce uniqueness on (order_id, product_id), so restoration must aggregate.
insert into public.order_items (
  order_id,
  product_id,
  product_name,
  quantity,
  unit_price,
  total_price
)
values
(
  '70000000-0000-0000-0000-000000000009',
  '70000000-0000-0000-0000-000000000008',
  'Rejection stock test product',
  2,
  10.00,
  20.00
),
(
  '70000000-0000-0000-0000-000000000009',
  '70000000-0000-0000-0000-000000000008',
  'Rejection stock test product',
  3,
  10.00,
  30.00
);

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '70000000-0000-0000-0000-000000000008'
  ) = 7,
  'fixture represents stock after five reserved units were deducted'
);

-- Simulate the authenticated vendor.
select set_config(
  'request.jwt.claim.sub',
  '70000000-0000-0000-0000-000000000002',
  true
);

set local role authenticated;

select public.test_assert(
  auth.uid() = '70000000-0000-0000-0000-000000000002'::uuid,
  'vendor auth context is active'
);

select public.test_assert(
  public.get_vendor_id() =
    '70000000-0000-0000-0000-000000000003'::uuid,
  'vendor fixture resolves through get_vendor_id'
);

select *
from public.vendor_update_order_status(
  '70000000-0000-0000-0000-000000000009',
  'rejected'
);

select public.test_assert(
  (
    select order_status
    from public.orders
    where id = '70000000-0000-0000-0000-000000000009'
  ) = 'rejected',
  'vendor rejection sets order status to rejected'
);

select public.test_assert(
  (
    select rejected_at
    from public.orders
    where id = '70000000-0000-0000-0000-000000000009'
  ) is not null,
  'vendor rejection stamps rejected_at'
);

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '70000000-0000-0000-0000-000000000008'
  ) = 12,
  'vendor rejection restores aggregated order-item stock'
);

do $$
declare
  second_rejection_failed boolean := false;
begin
  begin
    perform *
    from public.vendor_update_order_status(
      '70000000-0000-0000-0000-000000000009',
      'rejected'
    );
  exception
    when others then
      second_rejection_failed := true;
  end;

  if not second_rejection_failed then
    raise exception
      'TEST FAILED: second rejection must be rejected by lifecycle validation';
  end if;
end;
$$;

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '70000000-0000-0000-0000-000000000008'
  ) = 12,
  'failed second rejection does not restore stock twice'
);

select public.test_pass(
  'vendor rejection stock restoration contract'
);

rollback;
