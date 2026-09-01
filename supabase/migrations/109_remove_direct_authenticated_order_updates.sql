-- Orders are mutated only through dedicated SECURITY DEFINER RPCs.
--
-- Migration 063 accidentally restored table-wide UPDATE to authenticated,
-- which allowed every orders column to become UPDATE-capable subject only
-- to the remaining row policies.
--
-- Current customer, vendor, driver, and admin mutation flows use dedicated
-- RPCs, so authenticated clients no longer need direct UPDATE access.

revoke update on table public.orders from authenticated;

-- Explicitly revoke the historical column-level grant from migration 002 as
-- well. This keeps the migration correct even if PostgreSQL retains explicit
-- column privileges independently of the table-level grant.
revoke update (order_status, driver_id)
on public.orders
from authenticated;

-- These policies are no longer part of the mutation boundary. Keeping them
-- would make a future accidental UPDATE grant dangerous again.
drop policy if exists "Admins can update orders"
on public.orders;

drop policy if exists "Admins can update orders driver"
on public.orders;

drop policy if exists "Drivers can update own orders"
on public.orders;

drop policy if exists "Vendors can update own orders"
on public.orders;
