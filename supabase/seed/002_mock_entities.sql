insert into public.profiles (id, full_name, phone, role)
values
  ('00000000-0000-0000-0000-000000000000', 'MediFast Admin', '+15550000001', 'admin'),
  ('11111111-1111-1111-1111-111111111111', 'Demo Customer', '+15551234444', 'customer'),
  ('22222222-2222-2222-2222-222222222222', 'Amina Yusuf', '+15552220000', 'driver'),
  ('33333333-3333-3333-3333-333333333333', 'GreenCare Vendor Owner', '+15551128899', 'vendor'),
  ('44444444-4444-4444-4444-444444444444', 'David Mensah', '+15553330000', 'driver'),
  ('55555555-5555-5555-5555-555555555555', 'Lina Noor', '+15554440000', 'driver'),
  ('66666666-6666-6666-6666-666666666666', 'WellSpring Vendor Owner', '+15556667777', 'vendor')
on conflict (id) do nothing;

insert into public.customers (id, user_id)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.drivers (id, user_id, is_available, current_lat, current_lng, approval_status)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', true, 24.7148000, 46.6814000, 'approved'),
  ('bbbbbbbb-1111-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', true, 24.7195000, 46.6840000, 'approved'),
  ('bbbbbbbb-2222-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', false, 24.7082000, 46.6701000, 'approved')
on conflict (id) do nothing;

insert into public.vendors (
  id, user_id, name, slug, description, phone, address_line_1, city, area, lat, lng, approval_status
)
values
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  'GreenCare Pharmacy',
  'greencare-pharmacy',
  'Neighborhood pharmacy with express essentials.',
  '+15551128899',
  '14 King Street',
  'Sedalia Heights',
  'Central District',
  24.7136000,
  46.6753000,
  'approved'
),
(
  'ddddcccc-cccc-cccc-cccc-cccccccccccc',
  '66666666-6666-6666-6666-666666666666',
  'WellSpring Medics',
  'wellspring-medics',
  'Wellness and personal care pharmacy.',
  '+15556667777',
  '22 Cedar Avenue',
  'Sedalia Heights',
  'Westside',
  24.7169000,
  46.6888000,
  'approved'
)
on conflict (id) do nothing;

insert into public.addresses (id, customer_id, label, line_1, line_2, city, area, lat, lng)
values (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Home',
  '48 Maple Residency',
  'Flat 7C',
  'Sedalia Heights',
  'Central District',
  24.7136000,
  46.6753000
)
on conflict (id) do nothing;

update public.customers
set default_address_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

insert into public.products (
  id, vendor_id, category_id, name, description, price, image_url, barcode, stock_quantity, is_active
)
select
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  c.id,
  'Paracetamol 500mg',
  'Fast relief for fever and mild pain.',
  6.50,
  'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
  '890100000001',
  120,
  true
from public.categories c
where c.name = 'Medicine'
on conflict (id) do nothing;

insert into public.products (
  id, vendor_id, category_id, name, description, price, image_url, barcode, stock_quantity, is_active
)
select
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  c.id,
  'Vitamin C Tablets',
  'Daily immune support with orange flavor.',
  12.00,
  'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80',
  '890100000002',
  75,
  true
from public.categories c
where c.name = 'Vitamins'
on conflict (id) do nothing;

insert into public.products (
  id, vendor_id, category_id, name, description, price, image_url, barcode, stock_quantity, is_active
)
select
  'abababab-abab-abab-abab-abababababab',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  c.id,
  'Baby Thermometer',
  'Soft tip digital thermometer for infants and toddlers.',
  18.50,
  'https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&q=80',
  '890100000010',
  40,
  true
from public.categories c
where c.name = 'Baby Care'
on conflict (id) do nothing;

insert into public.products (
  id, vendor_id, category_id, name, description, price, image_url, barcode, stock_quantity, is_active
)
select
  'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd',
  'ddddcccc-cccc-cccc-cccc-cccccccccccc',
  c.id,
  'Digital Blood Pressure Monitor',
  'Arm cuff monitor for accurate home readings.',
  49.00,
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
  '890100000011',
  15,
  true
from public.categories c
where c.name = 'Medical Devices'
on conflict (id) do nothing;

insert into public.products (
  id, vendor_id, category_id, name, description, price, image_url, barcode, stock_quantity, is_active
)
select
  'efefefef-efef-efef-efef-efefefefefef',
  'ddddcccc-cccc-cccc-cccc-cccccccccccc',
  c.id,
  'Hydration Skin Lotion',
  'Daily moisturizing lotion for sensitive skin.',
  14.25,
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=800&q=80',
  '890100000012',
  33,
  true
from public.categories c
where c.name = 'Skin Care'
on conflict (id) do nothing;

insert into public.orders (
  id, customer_id, vendor_id, driver_id, subtotal, delivery_fee, total, payment_method, payment_status, order_status, delivery_address_id
)
values (
  '99999999-9999-9999-9999-999999999999',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  25.00,
  4.00,
  29.00,
  'cash_on_delivery',
  'pending',
  'on_the_way',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
)
on conflict (id) do nothing;

insert into public.orders (
  id, customer_id, vendor_id, driver_id, subtotal, delivery_fee, total, payment_method, payment_status, order_status, delivery_address_id
)
values
  ('99999999-1111-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, 12.00, 4.00, 16.00, 'cash_on_delivery', 'pending', 'placed', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-2222-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, 18.50, 4.00, 22.50, 'cash_on_delivery', 'pending', 'accepted', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-3333-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, 24.00, 4.00, 28.00, 'cash_on_delivery', 'pending', 'preparing', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-4444-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ddddcccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 49.00, 5.50, 54.50, 'cash_on_delivery', 'pending', 'assigned', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-5555-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ddddcccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-1111-bbbb-bbbb-bbbbbbbbbbbb', 14.25, 5.50, 19.75, 'cash_on_delivery', 'pending', 'on_the_way', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-6666-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-1111-bbbb-bbbb-bbbbbbbbbbbb', 6.50, 4.00, 10.50, 'cash_on_delivery', 'collected', 'delivered', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-7777-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ddddcccc-cccc-cccc-cccc-cccccccccccc', null, 49.00, 5.50, 54.50, 'cash_on_delivery', 'pending', 'rejected', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-8888-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, 18.50, 4.00, 22.50, 'cash_on_delivery', 'pending', 'ready_for_pickup', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  ('99999999-0001-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, 12.00, 4.00, 16.00, 'cash_on_delivery', 'pending', 'cancelled', 'dddddddd-dddd-dddd-dddd-dddddddddddd')
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, quantity, unit_price, total_price)
values
  ('12121212-1212-1212-1212-121212121212', '99999999-9999-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 2, 6.50, 13.00),
  ('13131313-1313-1313-1313-131313131313', '99999999-9999-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 12.00, 12.00)
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, quantity, unit_price, total_price)
values
  ('22222222-1212-1212-1212-121212121212', '99999999-1111-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 12.00, 12.00),
  ('33333333-1212-1212-1212-121212121212', '99999999-2222-9999-9999-999999999999', 'abababab-abab-abab-abab-abababababab', 1, 18.50, 18.50),
  ('44444444-1212-1212-1212-121212121212', '99999999-3333-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 6.50, 6.50),
  ('55555555-1212-1212-1212-121212121212', '99999999-3333-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 12.00, 12.00),
  ('66666666-1212-1212-1212-121212121212', '99999999-3333-9999-9999-999999999999', 'abababab-abab-abab-abab-abababababab', 1, 5.50, 5.50),
  ('77777777-1212-1212-1212-121212121212', '99999999-4444-9999-9999-999999999999', 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd', 1, 49.00, 49.00),
  ('88888888-1212-1212-1212-121212121212', '99999999-5555-9999-9999-999999999999', 'efefefef-efef-efef-efef-efefefefefef', 1, 14.25, 14.25),
  ('99999998-1212-1212-1212-121212121212', '99999999-6666-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 6.50, 6.50),
  ('99999997-1212-1212-1212-121212121212', '99999999-7777-9999-9999-999999999999', 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd', 1, 49.00, 49.00),
  ('99999996-1212-1212-1212-121212121212', '99999999-8888-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 12.00, 12.00),
  ('99999995-1212-1212-1212-121212121212', '99999999-8888-9999-9999-999999999999', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 1, 6.50, 6.50),
  ('99999994-1212-1212-1212-121212121212', '99999999-0001-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 1, 12.00, 12.00)
on conflict (id) do nothing;

insert into public.delivery_tracking (id, order_id, driver_id, lat, lng, status)
values
  ('14141414-1414-1414-1414-141414141414', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 24.7148000, 46.6814000, 'accepted'),
  ('15151515-1515-1515-1515-151515151515', '99999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 24.7153000, 46.6795000, 'on_the_way')
on conflict (id) do nothing;

insert into public.delivery_tracking (id, order_id, driver_id, lat, lng, status)
values
  ('16161616-1616-1616-1616-161616161616', '99999999-4444-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 24.7171000, 46.6861000, 'assigned'),
  ('17171717-1717-1717-1717-171717171717', '99999999-5555-9999-9999-999999999999', 'bbbbbbbb-1111-bbbb-bbbb-bbbbbbbbbbbb', 24.7184000, 46.6823000, 'on_the_way'),
  ('18181818-1818-1818-1818-181818181818', '99999999-6666-9999-9999-999999999999', 'bbbbbbbb-1111-bbbb-bbbb-bbbbbbbbbbbb', 24.7139000, 46.6764000, 'delivered')
on conflict (id) do nothing;
