drop policy if exists "available drivers can select pickup-ready addresses" on public.addresses;
drop policy if exists "available drivers can select pickup-ready customers" on public.customers;
drop policy if exists "available drivers can select pickup-ready orders" on public.orders;

drop policy if exists "vendors can select own orders" on public.orders;
drop policy if exists "vendors can update own orders" on public.orders;