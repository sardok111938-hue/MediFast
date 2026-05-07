insert into public.categories (name, name_ar, icon)
values
  ('Medicine', 'الأدوية', 'cross'),
  ('Vitamins', 'الفيتامينات', 'leaf'),
  ('Skin Care', 'العناية بالبشرة', 'sparkles'),
  ('Baby Care', 'العناية بالطفل', 'heart'),
  ('Medical Devices', 'الأجهزة الطبية', 'pulse'),
  ('Personal Care', 'العناية الشخصية', 'drop')
on conflict (name) do nothing;

insert into public.coupons (code, description, discount_type, discount_value, active)
values
  ('WELCOME10', 'Welcome discount', 'percent', 10, true),
  ('CARE5', 'Flat discount', 'flat', 5, true)
on conflict (code) do nothing;
