# MediFast

MediFast is a `pnpm` monorepo for a pharmacy delivery marketplace MVP with three runnable apps backed by Supabase:

- `apps/customer-app`: Expo customer ordering and tracking app
- `apps/driver-app`: Expo driver delivery app
- `apps/dashboard`: Next.js admin and vendor dashboard

The current order lifecycle is:

`placed -> accepted -> preparing -> ready_for_pickup -> assigned -> picked_up -> on_the_way -> delivered`

## Monorepo Overview

```text
apps/
  customer-app/      Expo app for customers
  driver-app/        Expo app for drivers
  dashboard/         Next.js admin + vendor dashboard
packages/
  i18n/              Shared translation keys and Arabic copy
  supabase/          Shared Supabase helpers
  types/             Shared domain types
  ui/                Shared design tokens
supabase/
  migrations/        SQL schema + RLS + lifecycle alignment
  seed/              Local/dev seed data and auth mapping notes
docs/
  *.md               Project notes and audits
```

## Requirements

- Node.js 20 or newer
- Corepack enabled
- A Supabase project

## Install

From the repo root:

```bash
corepack enable
corepack prepare pnpm@10.11.0 --activate
pnpm install
```

## Environment Variables

Create local env files from the examples:

```bash
cp apps/customer-app/.env.example apps/customer-app/.env
cp apps/driver-app/.env.example apps/driver-app/.env
cp apps/dashboard/.env.example apps/dashboard/.env.local
```

Use the same Supabase project across all apps.

### Customer App

File: `apps/customer-app/.env`

Required:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Driver App

File: `apps/driver-app/.env`

Required:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Dashboard

File: `apps/dashboard/.env.local`

Required:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Notes:

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in any client app.
- Customer and driver Expo apps use only `EXPO_PUBLIC_*` values.
- Dashboard browser code uses only `NEXT_PUBLIC_*` values.

## Development Commands

Run all three apps from the repo root:

```bash
pnpm dev
```

This starts:

- dashboard on `http://127.0.0.1:3000`
- customer Expo dev server on port `8081`
- driver Expo dev server on port `8082`

Run each app individually:

```bash
pnpm dev:dashboard
pnpm dev:customer
pnpm dev:driver
```

Useful additional command:

```bash
pnpm build:dashboard
```

## Supabase Local Setup

Create a Supabase project, then apply the schema and seed in this order.

### 1. Storage

Create a public storage bucket named:

```text
product-images
```

### 2. Migrations

Apply these SQL files in order:

1. [supabase/migrations/001_initial_schema.sql](/Users/yaso/medifast/supabase/migrations/001_initial_schema.sql:1)
2. [supabase/migrations/002_driver_order_rls.sql](/Users/yaso/medifast/supabase/migrations/002_driver_order_rls.sql:1)
3. [supabase/migrations/003_customer_order_rls.sql](/Users/yaso/medifast/supabase/migrations/003_customer_order_rls.sql:1)
4. [supabase/migrations/004_order_lifecycle_alignment.sql](/Users/yaso/medifast/supabase/migrations/004_order_lifecycle_alignment.sql:1)

These migrations set up:

- core schema
- role helpers:
  - `public.get_customer_id()`
  - `public.get_vendor_id()`
  - `public.get_driver_id()`
- order RLS
- lifecycle enforcement trigger

### 3. Seed Data

For local/dev only, apply these SQL files in order:

1. [supabase/seed/001_mock_seed.sql](/Users/yaso/medifast/supabase/seed/001_mock_seed.sql:1)
2. [supabase/seed/002_mock_entities.sql](/Users/yaso/medifast/supabase/seed/002_mock_entities.sql:1)

Use [supabase/seed/003_auth_mapping_notes.sql](/Users/yaso/medifast/supabase/seed/003_auth_mapping_notes.sql:1) as a helper when mapping real Auth user IDs to the seeded profile rows.

## Test Accounts And Role Mapping

Create these users in Supabase Auth:

- `admin@medifast.test`
- `vendor@medifast.test`
- `driver@medifast.test`
- `customer@medifast.test`

Use any password you want for local testing, for example:

```text
Medifast123!
```

### Map Auth Users To Seeded Profiles

After creating the users in Supabase Dashboard:

1. Copy each Auth user UUID.
2. Open the SQL editor.
3. Update the seeded `profiles.auth_user_id` values.

Example:

```sql
update public.profiles
set auth_user_id = 'ADMIN_AUTH_USER_UUID'
where id = '00000000-0000-0000-0000-000000000000';

update public.profiles
set auth_user_id = 'VENDOR_AUTH_USER_UUID'
where id = '33333333-3333-3333-3333-333333333333';

update public.profiles
set auth_user_id = 'DRIVER_AUTH_USER_UUID'
where id = '22222222-2222-2222-2222-222222222222';

update public.profiles
set auth_user_id = 'CUSTOMER_AUTH_USER_UUID'
where id = '11111111-1111-1111-1111-111111111111';
```

### Role Summary

- `admin@medifast.test`
  - profile id: `00000000-0000-0000-0000-000000000000`
  - role: `admin`
- `vendor@medifast.test`
  - profile id: `33333333-3333-3333-3333-333333333333`
  - seeded vendor id: `cccccccc-cccc-cccc-cccc-cccccccccccc`
  - role: `vendor`
- `driver@medifast.test`
  - profile id: `22222222-2222-2222-2222-222222222222`
  - seeded driver id: `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
  - role: `driver`
- `customer@medifast.test`
  - profile id: `11111111-1111-1111-1111-111111111111`
  - seeded customer id: `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
  - role: `customer`

## Auth And RLS Notes

- Every signed-in user must have a matching `public.profiles` row.
- Customers must also map to `public.customers`.
- Drivers must also map to `public.drivers`.
- Vendors must also map to `public.vendors`.
- Admins only require the `profiles` row.

Role helpers used by the apps:

- customer app: `get_customer_id()`
- driver app: `get_driver_id()`
- vendor dashboard: `get_vendor_id()`

## Full Lifecycle Smoke Test

Use this smoke test to verify the full order lifecycle across the customer app, vendor dashboard, admin assignment page, driver app, and customer tracking.

### Seeded Order Candidates

The local seed includes orders in multiple states. For an end-to-end progression test, start with a `placed` order and move it forward.

Example seeded order to walk through:

- `99999999-1111-9999-9999-999999999999`

### Step 1: Customer

1. Sign in to `apps/customer-app` as `customer@medifast.test`.
2. Open order history.
3. Confirm the customer sees only their own orders.
4. Confirm the placed order appears with:
   - order id
   - vendor/store
   - total
   - payment status
   - order status
   - created date
   - delivery address

### Step 2: Vendor

1. Sign in to the dashboard as `vendor@medifast.test`.
2. Open vendor orders.
3. Find the same order.
4. Move it through:
   - `placed -> accepted`
   - `accepted -> preparing`
   - `preparing -> ready_for_pickup`

### Step 3: Admin Assignment

1. Sign in to the dashboard as `admin@medifast.test`.
2. Open `/admin/assignments`.
3. Confirm the default filter shows `ready_for_pickup`.
4. Select an approved available driver.
5. Assign the order.
6. Confirm:
   - `driver_id` is set
   - `order_status` becomes `assigned`

### Step 4: Driver

1. Sign in to `apps/driver-app` as `driver@medifast.test`.
2. Confirm the assigned order appears only for that driver.
3. Open the order detail.
4. Move it through:
   - `assigned -> picked_up -> on_the_way`
   - `on_the_way -> delivered`

### Step 5: Customer Tracking

1. Keep the customer order detail screen open while the vendor/admin/driver steps run.
2. Confirm Realtime updates refresh the order detail and timeline.
3. Verify the customer sees:
   - vendor/store
   - delivery address
   - item list
   - driver name if assigned
   - current status
   - delivered confirmation at the end

## Verification Commands

Run these from the repo root:

```bash
pnpm typecheck
pnpm --filter @medifast/dashboard typecheck
pnpm --filter @medifast/customer-app exec tsc --noEmit
pnpm --filter @medifast/driver-app exec tsc --noEmit
pnpm --filter @medifast/customer-app exec expo export --platform web
pnpm --filter @medifast/driver-app exec expo export --platform web
```

## Current Safety Notes

- Client apps use only anon/public Supabase keys.
- Service role keys must never be exposed to browsers or Expo clients.
- Seed data is for local/dev smoke testing only.
