# Deployment Checklist

Use this checklist before releasing MediFast to a shared environment.

## Environment Variables

### Customer App

Set in `apps/customer-app/.env` or your deployment equivalent:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Driver App

Set in `apps/driver-app/.env` or your deployment equivalent:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Dashboard

Set in `apps/dashboard/.env.local` or your deployment equivalent:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Checks:

- all three apps point to the same intended Supabase project
- no client bundle contains `SUPABASE_SERVICE_ROLE_KEY`

## Supabase

Confirm these migrations are applied in order:

1. `001_initial_schema.sql`
2. `002_driver_order_rls.sql`
3. `003_customer_order_rls.sql`
4. `004_order_lifecycle_alignment.sql`

Confirm:

- RLS is enabled on `public.orders`
- role helpers exist:
  - `get_customer_id()`
  - `get_vendor_id()`
  - `get_driver_id()`
- lifecycle enforcement trigger is present

## Seed Data

- Apply seed files only for local/dev smoke testing
- Do not load mock seed data into production unless you explicitly want demo records

## Client Safety

Verify:

- no service role key in customer app code
- no service role key in driver app code
- no service role key in dashboard browser code
- Expo apps persist auth with AsyncStorage
- each app uses one shared Supabase client path

## Build And Typecheck

Run from the repo root:

```bash
pnpm typecheck
pnpm --filter @medifast/dashboard typecheck
pnpm --filter @medifast/customer-app exec tsc --noEmit
pnpm --filter @medifast/driver-app exec tsc --noEmit
pnpm --filter @medifast/customer-app exec expo export --platform web
pnpm --filter @medifast/driver-app exec expo export --platform web
```

## Manual Smoke Test

Use these accounts after mapping Auth users to seeded profiles:

- `admin@medifast.test`
- `vendor@medifast.test`
- `driver@medifast.test`
- `customer@medifast.test`

Walk the lifecycle:

1. Customer sees their own order in order history
2. Vendor moves order:
   - `placed -> accepted -> preparing -> ready_for_pickup`
3. Admin assigns a driver:
   - `ready_for_pickup -> assigned`
4. Driver moves order:
   - `assigned -> on_the_way -> delivered`
5. Customer tracking updates live through Realtime

## Final Release Sanity Checks

- dashboard loads and can log in
- vendor can only see vendor-owned orders
- driver can only see assigned orders
- customer can only see their own orders
- assignment screen only assigns `ready_for_pickup` orders
- no stale statuses are exposed in current UI flow
