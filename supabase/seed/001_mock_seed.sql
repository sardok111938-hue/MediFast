insert into public.categories (name, icon)
values
  ('Medicine', 'cross'),
  ('Vitamins', 'leaf'),
  ('Skin Care', 'sparkles'),
  ('Baby Care', 'heart'),
  ('Medical Devices', 'pulse'),
  ('Personal Care', 'drop')
on conflict (name) do nothing;

insert into public.coupons (code, description, discount_type, discount_value, active)
values
  ('WELCOME10', 'Welcome discount', 'percent', 10, true),
  ('CARE5', 'Flat discount', 'flat', 5, true)
on conflict (code) do nothing;
