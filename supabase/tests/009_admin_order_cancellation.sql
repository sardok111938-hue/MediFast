begin;

-- Admin profile.
insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values (
  '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000002',
  'Admin Cancellation Test',
  'admin'
);

-- Vendor profile/vendor.
insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values (
  '90000000-0000-0000-0000-000000000003',
  '90000000-0000-0000-0000-000000000004',
  'Admin Cancellation Vendor',
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
  '90000000-0000-0000-0000-000000000005',
  '90000000-0000-0000-0000-000000000003',
  'Admin Cancellation Vendor',
  'admin-cancellation-test',
  'approved',
  true
);

-- Customer profile/customer/address.
insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values (
  '90000000-0000-0000-0000-000000000006',
  '90000000-0000-0000-0000-000000000007',
  'Admin Cancellation Customer',
  'customer'
);

insert into public.customers (
  id,
  user_id
)
values (
  '90000000-0000-0000-0000-000000000008',
  '90000000-0000-0000-0000-000000000006'
);

insert into public.addresses (
  id,
  customer_id,
  line_1
)
values (
  '90000000-0000-0000-0000-000000000009',
  '90000000-0000-0000-0000-000000000008',
  'Admin cancellation test address'
);

-- Driver profile/driver.
insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values (
  '90000000-0000-0000-0000-000000000010',
  '90000000-0000-0000-0000-000000000011',
  'Admin Cancellation Driver',
  'driver'
);

insert into public.drivers (
  id,
  user_id,
  approval_status,
  is_available
)
values (
  '90000000-0000-0000-0000-000000000012',
  '90000000-0000-0000-0000-000000000010',
  'approved',
  false
);

-- Product stock represents an already-reserved order:
-- original 12, five reserved, current stock 7.
insert into public.products (
  id,
  vendor_id,
  name,
  price,
  stock_quantity,
  is_active
)
values (
  '90000000-0000-0000-0000-000000000013',
  '90000000-0000-0000-0000-000000000005',
  'Admin cancellation product',
  10.00,
  7,
  true
);

-- Target assigned order to cancel.
insert into public.orders (
  id,
  customer_id,
  vendor_id,
  driver_id,
  subtotal,
  delivery_fee,
  total,
  payment_method,
  payment_status,
  order_status,
  delivery_address_id
)
values (
  '90000000-0000-0000-0000-000000000014',
  '90000000-0000-0000-0000-000000000008',
  '90000000-0000-0000-0000-000000000005',
  '90000000-0000-0000-0000-000000000012',
  50.00,
  0.00,
  50.00,
  'cash_on_delivery',
  'pending',
  'assigned',
  '90000000-0000-0000-0000-000000000009'
);

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
  '90000000-0000-0000-0000-000000000014',
  '90000000-0000-0000-0000-000000000013',
  'Admin cancellation product',
  2,
  10.00,
  20.00
),
(
  '90000000-0000-0000-0000-000000000014',
  '90000000-0000-0000-0000-000000000013',
  'Admin cancellation product',
  3,
  10.00,
  30.00
);

-- A second active order keeps the driver's remaining active count at one.
insert into public.orders (
  id,
  customer_id,
  vendor_id,
  driver_id,
  subtotal,
  delivery_fee,
  total,
  payment_method,
  payment_status,
  order_status,
  delivery_address_id
)
values (
  '90000000-0000-0000-0000-000000000015',
  '90000000-0000-0000-0000-000000000008',
  '90000000-0000-0000-0000-000000000005',
  '90000000-0000-0000-0000-000000000012',
  10.00,
  0.00,
  10.00,
  'cash_on_delivery',
  'pending',
  'assigned',
  '90000000-0000-0000-0000-000000000009'
);

select set_config(
  'request.jwt.claim.sub',
  '90000000-0000-0000-0000-000000000002',
  true
);

set local role authenticated;

select public.test_assert(
  auth.uid() = '90000000-0000-0000-0000-000000000002'::uuid,
  'admin auth context is active'
);

select public.test_assert(
  public.is_admin(),
  'admin fixture resolves through is_admin'
);

select *
from public.admin_cancel_order(
  '90000000-0000-0000-0000-000000000014'
);

reset role;

select public.test_assert(
  (
    select order_status
    from public.orders
    where id = '90000000-0000-0000-0000-000000000014'
  ) = 'cancelled',
  'admin cancellation sets order status to cancelled'
);

select public.test_assert(
  (
    select cancelled_at
    from public.orders
    where id = '90000000-0000-0000-0000-000000000014'
  ) is not null,
  'admin cancellation stamps cancelled_at'
);

select public.test_assert(
  (
    select driver_id
    from public.orders
    where id = '90000000-0000-0000-0000-000000000014'
  ) = '90000000-0000-0000-0000-000000000012'::uuid,
  'admin cancellation retains driver_id for audit history'
);

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '90000000-0000-0000-0000-000000000013'
  ) = 12,
  'admin cancellation restores aggregated stock'
);

select public.test_assert(
  (
    select is_available
    from public.drivers
    where id = '90000000-0000-0000-0000-000000000012'
  ),
  'driver becomes available when one active order remains'
);

-- Double cancellation must fail and must not restore stock again.
set local role authenticated;

do $$
declare
  second_cancel_failed boolean := false;
begin
  begin
    perform *
    from public.admin_cancel_order(
      '90000000-0000-0000-0000-000000000014'
    );
  exception
    when others then
      second_cancel_failed := true;
  end;

  if not second_cancel_failed then
    raise exception
      'TEST FAILED: second admin cancellation must fail';
  end if;
end;
$$;

reset role;

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '90000000-0000-0000-0000-000000000013'
  ) = 12,
  'failed second admin cancellation does not restore stock twice'
);

-- Post-pickup cancellation must be rejected.
reset role;

insert into public.orders (
  id,
  customer_id,
  vendor_id,
  driver_id,
  subtotal,
  delivery_fee,
  total,
  payment_method,
  payment_status,
  order_status,
  delivery_address_id
)
values (
  '90000000-0000-0000-0000-000000000016',
  '90000000-0000-0000-0000-000000000008',
  '90000000-0000-0000-0000-000000000005',
  '90000000-0000-0000-0000-000000000012',
  10.00,
  0.00,
  10.00,
  'cash_on_delivery',
  'pending',
  'picked_up',
  '90000000-0000-0000-0000-000000000009'
);

set local role authenticated;

do $$
declare
  picked_up_cancel_failed boolean := false;
begin
  begin
    perform *
    from public.admin_cancel_order(
      '90000000-0000-0000-0000-000000000016'
    );
  exception
    when others then
      picked_up_cancel_failed := true;
  end;

  if not picked_up_cancel_failed then
    raise exception
      'TEST FAILED: admin must not cancel a picked-up order';
  end if;
end;
$$;

select public.test_assert(
  (
    select order_status
    from public.orders
    where id = '90000000-0000-0000-0000-000000000016'
  ) = 'picked_up',
  'failed post-pickup cancellation leaves status unchanged'
);

select public.test_assert(
  (
    select cancelled_at
    from public.orders
    where id = '90000000-0000-0000-0000-000000000016'
  ) is null,
  'failed post-pickup cancellation does not stamp cancelled_at'
);

select public.test_pass(
  'admin pre-pickup order cancellation contract'
);

rollback;
