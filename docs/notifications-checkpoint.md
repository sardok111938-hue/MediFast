# MediFast Notifications Checkpoint — May 2026

## Current Status

Notification backend infrastructure is now working end-to-end.

Confirmed flow:

```text
checkout
→ enqueue notification
→ queue worker claims notification
→ edge function processes notification
→ Expo send attempt occurs
→ failure/success stored correctly
```

Latest verified result:

* Customer checkout successfully creates notification rows.
* Queue worker processes rows safely.
* Failure reason currently is only missing Expo push token.

---

# Completed Infrastructure

## Notifications Table Hardening

Implemented:

* `queued`
* `processing`
* `sent`
* `failed`

Additional fields:

* `attempt_count`
* `last_attempt_at`
* `sent_at`
* `error_message`
* `dedupe_key`

Indexes added:

* queue index
* processing recovery index
* order lookup index
* dedupe partial unique index

---

# Queue Safety

## claim_queued_notifications RPC

Now safely:

* recovers stale `processing` rows
* marks exhausted stale rows `failed`
* atomically claims rows
* uses `FOR UPDATE SKIP LOCKED`
* prevents duplicate concurrent sends
* increments retry counters safely

Flow:

```text
queued → processing → sent/failed
```

---

# Edge Function

Function:

```text
supabase/functions/send-notifications/index.ts
```

Current behavior:

* claims notifications via RPC
* processes only claimed rows
* sends Expo push requests
* marks success as `sent`
* marks retryable failures back to `queued`
* marks terminal failures `failed`
* handles missing push token safely
* includes Android channel:

```text
channelId: "orders"
```

---

# Enqueue Helper

Function added:

```sql
public.enqueue_order_notification(...)
```

Purpose:

* centralized backend-only notification insertion
* dedupe protection
* avoids duplicate notification rows

Security:

* revoked from `public`
* revoked from `anon`
* revoked from `authenticated`

Only backend/security-definer functions should call it.

---

# Lifecycle Wiring

## Currently Wired

### customer.order.placed

Inside:

```sql
public.create_cod_order(jsonb)
```

Creates notification:

```text
تم استلام طلبك
```

Payload:

```json
{
  "event": "customer.order.placed",
  "status": "placed"
}
```

Verified working.

---

# Current Limitation

## Expo Push Tokens

Backend is working.

Current remaining blocker:

```text
Missing push token
```

Reason:

* Expo Go does not fully support push notifications in SDK 53+
* Requires development build or production build

So notification rows are processed correctly but cannot yet be delivered to device.

---

# Verified Test Result

Confirmed notification row:

```text
title: تم استلام طلبك
status: queued → failed
error: Missing push token
```

This proves:

* checkout wiring works
* enqueue helper works
* queue worker works
* edge function works
* failure handling works

---

# Safe Next Steps Later

Recommended future order:

1. Real Expo development build
2. Verify token registration
3. Verify actual device delivery
4. Wire additional lifecycle events one-by-one:

   * accepted
   * preparing
   * ready_for_pickup
   * assigned
   * on_the_way
   * delivered
   * cancelled
5. Add notification deep linking
6. Add foreground notification listeners
7. Add vendor/admin notifications if needed

---

# Important Safety Notes

Do NOT:

* bulk rewrite lifecycle RPCs
* wire all statuses at once
* remove queue claiming safeguards
* expose enqueue helper to authenticated clients

Preferred approach:

* wire lifecycle events one-by-one
* test each status independently
* keep backend authoritative

---

# Current Production Readiness

## Backend Notification Infrastructure

Status:

```text
Production-safe foundation established
```

## Actual Device Push Delivery

Status:

```text
Pending Expo development/production build setup
```
