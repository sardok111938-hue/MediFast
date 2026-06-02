# MediFast Notification System

## Status

Production verified on 2026-06-02.

The notification system is fully operational end-to-end.

## Architecture

```text
Order Event
    ↓
enqueue_order_notification()
    ↓
notifications table
    ↓
claim_queued_notifications()
    ↓
send-notifications Edge Function
    ↓
Expo Push API
    ↓
Customer / Driver Device
```

---

## Database Components

### Table

```text
public.notifications
```

Stores queued, processing, sent, and failed notifications.

### RPCs

#### enqueue_order_notification()

Creates notification records from business events.

#### claim_queued_notifications()

Claims queued notifications for processing.

Default batch size:

```text
20 notifications
```

---

## Edge Function

Location:

```text
supabase/functions/send-notifications
```

Responsibilities:

* Claim queued notifications
* Resolve recipient push token
* Send notification through Expo Push API
* Mark notification as sent
* Mark notification as failed on error
* Store failure reason

---

## Push Token Storage

### Customers

```text
public.customers.expo_push_token
```

Registered during customer bootstrap.

### Drivers

```text
public.drivers.expo_push_token
```

Registered during driver login.

Driver app EAS project:

```text
531df520-cb27-4fea-8b3e-043841ff8d60
```

---

## Customer Notifications

Supported events:

* Order placed
* Order accepted
* Order rejected
* Order preparing
* Ready for pickup
* Driver assigned
* On the way
* Delivered
* Cancelled
* Quote converted to order

---

## Driver Notifications

Supported events:

* Order assigned

---

## Scheduler

Location:

```text
.github/workflows/send-notifications.yml
```

Execution:

```cron
* * * * *
```

Runs every minute.

Uses GitHub Actions to invoke:

```text
POST /functions/v1/send-notifications
```

Required GitHub Secret:

```text
SUPABASE_ANON_KEY
```

---

## Verification Performed

### Before Worker

```text
failed = 17
queued = 41
sent   = 0
```

### After Worker + Scheduler

```text
failed = 17
queued = 0
sent   = 41
```

---

## Known Historical Failures

Existing failed notifications were caused by:

```text
Missing push token
```

These occurred before push token registration was fully configured.

No active notification failures remain.

---

## Operational Checklist

When creating a new notification type:

1. Add enqueue call in business workflow.
2. Add title/body/message payload.
3. Verify recipient role.
4. Verify recipient push token exists.
5. Create test notification.
6. Confirm notification reaches device.
7. Confirm status changes:

```text
queued
→ processing
→ sent
```

---

## Deployment Checklist

Verify:

* Edge Function deployed
* GitHub Action enabled
* SUPABASE_ANON_KEY secret configured
* Customer push tokens populated
* Driver push tokens populated

Verification query:

```sql
select status, count(*)
from public.notifications
group by status
order by status;
```

Expected healthy state:

```text
queued = 0
sent > 0
```

---

## Notification System Owner Notes

Notification subsystem is considered production-ready.

Do not modify:

* enqueue_order_notification()
* claim_queued_notifications()
* send-notifications

without re-running end-to-end delivery verification.
