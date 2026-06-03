update public.platform_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{default_low_stock_threshold}',
  '5'::jsonb,
  true
)
where key = 'inventory';
