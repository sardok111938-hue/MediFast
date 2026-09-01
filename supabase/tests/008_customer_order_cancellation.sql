begin;

insert into public.profiles (
  id,
  auth_user_id,
  full_name,
  role
)
values
(
  '80000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000002',
  'Cancellation Vendor',
  'vendor'
),
(
  '80000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000004',
  'Cancellation Customer',
  'customer'
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
  '80000000-0000-0000-0000-000000000005',
  '80000000-0000-0000-0000-000000000001',
  'Cancellation Vendor',
  'customer-cancellation-test',
  'approved',
  true
);

insert into public.customers (
  id,
  user_id
)
values (
  '80000000-0000-0000-0000-000000000006',
  '80000000-0000-0000-0000-000000000003'
);

insert into public.addresses (
  id,
  customer_id,
  line_1
)
values (
  '80000000-0000-0000-0000-000000000007',
  '80000000-0000-0000-0000-000000000006',
  'Cancellation test address'
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
  '80000000-0000-0000-0000-000000000008',
  '80000000-0000-0000-0000-000000000005',
  'Cancellation test product',
  10.00,
  7,
  true
);

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
  '80000000-0000-0000-0000-000000000009',
  '80000000-0000-0000-0000-000000000006',
  '80000000-0000-0000-0000-000000000005',
  50.00,
  0.00,
  50.00,
  'cash_on_delivery',
  'pending',
  'placed',
  '80000000-0000-0000-0000-000000000007'
);

-- Duplicate rows deliberately exercise aggregated stock restoration.
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
  '80000000-0000-0000-0000-000000000009',
  '80000000-0000-0000-0000-000000000008',
  'Cancellation test product',
  2,
  10.00,
  20.00
),
(
  '80000000-0000-0000-0000-000000000009',
  '80000000-0000-0000-0000-000000000008',
  'Cancellation test product',
  3,
  10.00,
  30.00
);

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '80000000-0000-0000-0000-000000000008'
  ) = 7,
  'fixture represents stock after five reserved units were deducted'
);

select set_config(
  'request.jwt.claim.sub',
  '80000000-0000-0000-0000-000000000004',
  true
);

set local role authenticated;

select public.test_assert(
  auth.uid() = '80000000-0000-0000-0000-000000000004'::uuid,
  'customer auth context is active'
);

select public.test_assert(
  public.get_customer_id() =
    '80000000-0000-0000-0000-000000000006'::uuid,
  'customer fixture resolves through get_customer_id'
);

select *
from public.customer_cancel_order(
  '80000000-0000-0000-0000-000000000009'
);

select public.test_assert(
  (
    select order_status
    from public.orders
    where id = '80000000-0000-0000-0000-000000000009'
  ) = 'cancelled',
  'customer cancellation sets order status to cancelled'
);

select public.test_assert(
  (
    select cancelled_at
    from public.orders
    where id = '80000000-0000-0000-0000-000000000009'
  ) is not null,
  'customer cancellation stamps cancelled_at'
);

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '80000000-0000-0000-0000-000000000008'
  ) = 12,
  'customer cancellation restores aggregated stock'
);

do $$
declare
  second_cancel_failed boolean := false;
begin
  begin
    perform *
    from public.customer_cancel_order(
      '80000000-0000-0000-0000-000000000009'
    );
  exception
    when others then
      second_cancel_failed := true;
  end;

  if not second_cancel_failed then
    raise exception
      'TEST FAILED: second customer cancellation must fail';
  end if;
end;
$$;

select public.test_assert(
  (
    select stock_quantity
    from public.products
    where id = '80000000-0000-0000-0000-000000000008'
  ) = 12,
  'failed second cancellation does not restore stock twice'
);

-- A customer must not be able to cancel an order after the vendor has
-- accepted it.

reset role;

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
  '80000000-0000-0000-0000-000000000010',
  '80000000-0000-0000-0000-000000000006',
  '80000000-0000-0000-0000-000000000005',
  10.00,
  0.00,
  10.00,
  'cash_on_delivery',
  'pending',
  'accepted',
  '80000000-0000-0000-0000-000000000007'
);

set local role authenticated;

do $$
declare
  accepted_cancel_failed boolean := false;
begin
  begin
    perform *
    from public.customer_cancel_order(
      '80000000-0000-0000-0000-000000000010'
    );
  exception
    when others then
      accepted_cancel_failed := true;
  end;

  if not accepted_cancel_failed then
    raise exception
      'TEST FAILED: customer must not cancel an accepted order';
  end if;
end;
$$;

select public.test_assert(
  (
    select order_status
    from public.orders
    where id = '80000000-0000-0000-0000-000000000010'
  ) = 'accepted',
  'failed cancellation leaves accepted order unchanged'
);

select public.test_assert(
  (
    select cancelled_at
    from public.orders
    where id = '80000000-0000-0000-0000-000000000010'
  ) is null,
  'failed cancellation does not stamp cancelled_at'
);

select public.test_pass(
  'customer placed-order cancellation contract'
);

rollback;
