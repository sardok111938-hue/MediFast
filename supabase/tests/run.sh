#!/bin/bash

psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/tests/000_test_helpers.sql \
  -f supabase/tests/001_core_workflow_contract.sql \
  -f supabase/tests/002_order_lifecycle.sql \
  -f supabase/tests/003_driver_claim_flow.sql \
  -f supabase/tests/004_prescription_quote_flow.sql \
  -f supabase/tests/005_admin_authorization_helper.sql \
  -f supabase/tests/006_sensitive_rpc_privileges.sql \
  -f supabase/tests/007_vendor_rejection_stock_restoration.sql \
  -f supabase/tests/008_customer_order_cancellation.sql
