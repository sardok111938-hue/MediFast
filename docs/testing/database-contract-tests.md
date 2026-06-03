# Database Contract Tests

## Purpose

These tests protect MediFast from schema drift and accidental removal of critical database objects.

They verify that core workflows remain available after a fresh database rebuild.

## Test Files

### 000_test_helpers.sql

Shared assertion helpers:

* test_assert()
* test_pass()

### 001_core_workflow_contract.sql

Verifies existence of:

* create_cod_order()
* driver_claim_order()
* create_cod_order_from_quote()

### 002_order_lifecycle.sql

Verifies:

* order lifecycle trigger exists
* lifecycle function exists
* required order statuses exist

### 003_driver_claim_flow.sql

Verifies:

* driver_claim_order() RPC
* driver availability helper
* pickup-order performance index
* driver pickup RLS policy

### 004_prescription_quote_flow.sql

Verifies:

* prescription request tables
* prescription quote tables
* prescription quote RPCs
* quote conversion RPC
* required indexes

---

## Running Tests

After a local reset:

```bash
supabase db reset
pnpm db:test
```

Expected result:

```txt
TEST PASSED: core workflow contract
TEST PASSED: order lifecycle contract
TEST PASSED: driver claim flow contract
TEST PASSED: prescription quote flow contract
```

---

## When To Run

Run these tests whenever:

* Adding a migration
* Modifying RLS
* Modifying RPCs
* Modifying order lifecycle logic
* Modifying prescription workflow logic
* Before merging schema-related pull requests

---

## Scope

These are contract tests.

They verify that critical objects exist and remain available.

They do not currently test:

* Full business workflows
* End-to-end application flows
* UI behaviour
* Performance characteristics

Those are covered separately by manual QA and integration testing.
