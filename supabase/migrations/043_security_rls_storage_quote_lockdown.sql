-- 043_security_rls_storage_quote_lockdown.sql

alter table public.prescription_quotes enable row level security;
alter table public.prescription_quote_items enable row level security;

drop policy if exists "vendors can insert own prescription quotes" on public.prescription_quotes;
drop policy if exists "vendors can update own prescription quotes" on public.prescription_quotes;
drop policy if exists "vendors can update own draft prescription quotes" on public.prescription_quotes;
drop policy if exists "customers can respond to own prescription quotes" on public.prescription_quotes;
drop policy if exists "customers can respond to own sent prescription quotes" on public.prescription_quotes;

drop policy if exists "vendors can insert own prescription quote items" on public.prescription_quote_items;
drop policy if exists "vendors can insert own draft prescription quote items" on public.prescription_quote_items;
drop policy if exists "vendors can update own prescription quote items" on public.prescription_quote_items;
drop policy if exists "vendors can update own draft prescription quote items" on public.prescription_quote_items;
drop policy if exists "vendors can delete own prescription quote items" on public.prescription_quote_items;
drop policy if exists "vendors can delete own draft prescription quote items" on public.prescription_quote_items;

drop policy if exists "admins can manage prescription quotes" on public.prescription_quotes;
drop policy if exists "admins can manage prescription quote items" on public.prescription_quote_items;

comment on table public.carts is
'RLS enabled with no direct client policies. Access only through controlled server/RPC flows if used.';

comment on table public.cart_items is
'RLS enabled with no direct client policies. Access only through controlled server/RPC flows if used.';

comment on table public.coupons is
'RLS enabled with no direct client policies. Coupon validation should remain server/RPC controlled.';

comment on table public.delivery_tracking is
'RLS enabled with no direct client policies. Direct driver insert function is currently unused; add RPC/policies only when live tracking is wired.';

comment on table public.notifications is
'RLS enabled with no direct client policies. Notification writes/claims should remain RPC controlled.';

comment on table public.reviews is
'RLS enabled with no direct client policies. Add scoped customer/vendor policies only when reviews are wired.';