insert into public.vendors (
  id,
  user_id,
  name,
  slug,
  description,
  phone,
  address_line_1,
  city,
  area,
  lat,
  lng,
  approval_status,
  is_active
)
values (
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
  'approved',
  true
)
on conflict (id) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  phone = excluded.phone,
  address_line_1 = excluded.address_line_1,
  city = excluded.city,
  area = excluded.area,
  lat = excluded.lat,
  lng = excluded.lng,
  approval_status = excluded.approval_status,
  is_active = excluded.is_active;

insert into public.categories (id, name, name_ar, icon)
values
  ('70000000-0000-0000-0000-000000000001', 'Medicine', 'الأدوية', 'cross'),
  ('70000000-0000-0000-0000-000000000002', 'Vitamins', 'الفيتامينات', 'leaf'),
  ('70000000-0000-0000-0000-000000000003', 'Personal Care', 'العناية الشخصية', 'drop')
on conflict (id) do update
set
  name = excluded.name,
  name_ar = excluded.name_ar,
  icon = excluded.icon;

insert into public.products (
  id,
  vendor_id,
  category_id,
  name,
  description,
  price,
  image_url,
  barcode,
  stock_quantity,
  is_active
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '70000000-0000-0000-0000-000000000001',
    'باراسيتامول 500 مجم',
    'مسكن وخافض للحرارة للاستخدام اليومي عند الحاجة.',
    6.50,
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
    '890200000001',
    120,
    true
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '70000000-0000-0000-0000-000000000001',
    'شراب للسعال بالأعشاب',
    'تركيبة مهدئة للحلق تساعد على تخفيف السعال الجاف.',
    18.00,
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    '890200000002',
    48,
    true
  ),
  (
    '80000000-0000-0000-0000-000000000003',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '70000000-0000-0000-0000-000000000002',
    'فيتامين سي فوار',
    'أقراص فوارة بنكهة البرتقال لدعم المناعة والطاقة.',
    14.75,
    'https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80',
    '890200000003',
    75,
    true
  ),
  (
    '80000000-0000-0000-0000-000000000004',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '70000000-0000-0000-0000-000000000002',
    'أوميغا 3',
    'مكمل غذائي لدعم صحة القلب والتركيز اليومي.',
    32.00,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
    '890200000004',
    52,
    true
  ),
  (
    '80000000-0000-0000-0000-000000000005',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '70000000-0000-0000-0000-000000000003',
    'غسول يدين لطيف',
    'غسول يومي برائحة منعشة مناسب للاستخدام المتكرر.',
    11.25,
    'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80',
    '890200000005',
    90,
    true
  ),
  (
    '80000000-0000-0000-0000-000000000006',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '70000000-0000-0000-0000-000000000003',
    'معقم جيب',
    'عبوة صغيرة سهلة الحمل لتعقيم اليدين أثناء التنقل.',
    8.90,
    'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=800&q=80',
    '890200000006',
    140,
    true
  )
on conflict (id) do update
set
  vendor_id = excluded.vendor_id,
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  image_url = excluded.image_url,
  barcode = excluded.barcode,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active;
