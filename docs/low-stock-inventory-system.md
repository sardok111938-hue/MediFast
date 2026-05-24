# MediFast Low Stock Threshold System — Locked End-to-End

## Implemented

### Database

#### products table

Uses:

* `low_stock_threshold integer NOT NULL`

Each product now has its own configurable threshold.

---

### platform_settings

Inventory config stored in:

```json
{
  "default_low_stock_threshold": 180
}
```

under:

```txt
key = inventory
```

---

## Admin Settings

### Admin can now:

* configure default low stock threshold
* save inventory settings
* apply threshold to all existing products

Page:

```txt
/admin/settings
```

---

### Apply-to-all flow

Button:

```txt
تطبيق هذا الحد على كل المنتجات الحالية
```

Runs:

```sql
update public.products
set low_stock_threshold = threshold
where id is not null;
```

This updates all existing products instantly.

---

## Vendor Product System

### Vendor create/edit form now supports:

```txt
حد التنبيه للمخزون
```

Features:

* editable per product
* validation
* non-negative only
* persisted through RPCs
* shown in edit form
* included in create flow

---

## RPCs Updated

### vendor_create_product

Added:

```sql
p_low_stock_threshold integer default 5
```

Stores:

```sql
low_stock_threshold
```

during insert.

---

### vendor_update_product

Added:

```sql
p_low_stock_threshold integer default null
```

Updates:

```sql
low_stock_threshold
```

during update.

---

## Dashboard Logic

Vendor inventory now detects low stock using:

```ts
product.stock_quantity <= product.low_stock_threshold
```

---

## Vendor UI Features

### Product row warning

Shows:

```txt
⚠️ مخزون منخفض
```

when stock is at or below threshold.

---

### Summary counters

Added:

* total products
* active
* inactive
* low stock
* out of stock

---

### Inventory alert card

Appears automatically when low stock exists.

Includes:

```txt
عرض المنتجات منخفضة المخزون
```

quick filter.

---

### Filters added

* all
* active
* inactive
* low stock
* out of stock

---

## Type Safety

Updated:

```ts
ProductRow
```

to include:

```ts
low_stock_threshold: number;
```

---

## Validation

Product form validates:

* price > 0
* stock >= 0
* threshold >= 0

---

## Fixed Issues

### RLS

Platform settings update policies fixed.

### Nested forms

Replaced nested form with `formAction`.

### Supabase update restriction

Added safe `.not("id", "is", null)` filter.

### RPC ambiguity

Removed old overloaded RPC versions.

### TypeScript

All dashboard type errors resolved.

---

## Final Behavior

### Admin flow

1. Set default threshold
2. Save settings
3. Apply to all products

---

### Vendor flow

Vendor sees:

* low stock warnings
* counters
* filters
* custom per-product thresholds

---

## Current Architecture

### Global threshold

Used as operational/admin default.

### Product threshold

Used as actual live inventory trigger.

This allows:

* centralized control
* per-product overrides
* scalable inventory management

---

## Recommended Next Improvements

### Priority 1

* wire admin default into NEW product creation automatically

### Priority 2

* color-coded inventory levels
* critical stock state
* stock analytics

### Priority 3

* push notifications for low stock
* vendor reminder notifications
* auto reorder suggestions

---

## Status

```txt
LOW STOCK INVENTORY SYSTEM:
LOCKED END-TO-END
```
