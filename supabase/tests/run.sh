#!/bin/bash
set -euo pipefail

psql -X -v ON_ERROR_STOP=1 \
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/tests/000_test_helpers.sql \
  -f supabase/tests/001_core_workflow_contract.sql \
  -f supabase/tests/002_order_lifecycle.sql \
  -f supabase/tests/003_driver_claim_flow.sql \
  -f supabase/tests/004_prescription_quote_flow.sql \
  -f supabase/tests/005_admin_authorization_helper.sql \
  -f supabase/tests/006_sensitive_rpc_privileges.sql \
  -f supabase/tests/007_vendor_rejection_stock_restoration.sql \
  -f supabase/tests/008_customer_order_cancellation.sql \
  -f supabase/tests/009_admin_order_cancellation.sql \
  -f supabase/tests/010_orders_direct_update_privileges.sql \
  -f supabase/tests/011_orders_table_privilege_baseline.sql \
  -f supabase/tests/012_product_dashboard_write_rpc.sql \
  -f supabase/tests/013_product_rpc_execute_privileges.sql \
  -f supabase/tests/014_products_table_privilege_baseline.sql \
  -f supabase/tests/015_identity_rls_helper_security.sql \
  -f supabase/tests/016_obsolete_vendor_product_overloads.sql \
  -f supabase/tests/017_customer_assigned_driver_read_policy.sql \
  -f supabase/tests/018_vendors_table_privilege_baseline.sql \
  -f supabase/tests/019_vendor_rpc_execute_privileges.sql \
  -f supabase/tests/020_obsolete_vendor_account_overloads.sql
