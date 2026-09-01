-- Harden identity lookup helpers used throughout RLS policies.
--
-- These helpers are SECURITY DEFINER and are intentionally evaluated
-- without caller row-level security to avoid recursive RLS evaluation.

alter function public.get_customer_id()
  set row_security = off;

alter function public.get_driver_id()
  set row_security = off;

alter function public.get_vendor_id()
  set row_security = off;
