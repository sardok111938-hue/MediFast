# MediFast Payload + Scaling Optimization Lock

## Status
LOCKED — all apps typecheck clean.

Validated:

```bash
pnpm --filter @medifast/customer-app exec tsc --noEmit
pnpm --filter @medifast/driver-app exec tsc --noEmit
pnpm --filter @medifast/dashboard exec tsc --noEmit
```

---

# Major Optimizations Completed

## 1. Customer Catalog Architecture Split

Previously:

- home
- search
- pharmacy detail
- category pages

all loaded the same marketplace payload through:

```ts
loadCustomerCatalogData()
```

This caused:
- heavy overfetch
- unnecessary Supabase bandwidth
- repeated large payload transfer
- scalability issues

Now split into dedicated loaders:

```ts
loadHomeCatalog()
searchProducts(query)
loadVendorProducts(vendorId)
loadCategoryProducts(categoryId)
```

Result:
- search fetches only matching products
- pharmacy page fetches only pharmacy products
- category page fetches only category products
- major payload reduction

---

# 2. Customer Order Payload Slimming

Created:

```ts
CUSTOMER_ORDER_LIST_SELECT
```

Used only in:

```ts
listCustomerOrders()
```

while preserving full payload in:

```ts
getCustomerOrder()
```

Result:
- history list lightweight
- detail screen still rich
- reduced nested transfer

---

# 3. Driver Order Payload Slimming

Created:

```ts
DRIVER_ORDER_LIST_SELECT
```

Applied to:

```ts
listAvailablePickupOrders()
listCurrentDriverOrders()
```

Preserved full payload in:

```ts
getDriverOrderDetail()
```

Result:
- lighter driver lists
- less repeated order item transfer
- faster refreshes

---

# 4. Dashboard Prescription Queue Optimization

Removed duplicate:
- customer query
- address query
- mapping roundtrips

Queue now uses relational data directly from initial select.

Result:
- fewer DB roundtrips
- less payload transfer
- cleaner architecture

---

# 5. Realtime Optimization

Optimized Supabase realtime subscriptions.

Before:

```ts
event: "*"
```

Now:
- assigned orders → `UPDATE`
- available pickups → `INSERT`

Result:
- reduced websocket events
- reduced realtime bandwidth
- fewer unnecessary refreshes

---

# 6. Image / Cache Cleanup

Optimized:

```ts
CatalogImage.tsx
```

Removed unstable cache-busting behavior.

Result:
- better image caching
- lower CDN egress
- fewer repeated downloads

---

# 7. Driver Location Tracking Fixes

Fixed:
- nullable `driverId`
- location update typing
- realtime order refresh integration

Added safe scoped:

```ts
const currentDriverId = driverId;
```

before async location callbacks.

---

# 8. Driver Signup Flow Fixes

Fixed:
- signup handler scope
- missing imports
- missing expo-constants dependency

Driver auth now typechecks correctly.

---

# 9. Dashboard Typed Routes Fixes

Fixed Next.js typed route issues by:
- importing `Route`
- casting dynamic hrefs correctly

Example:

```ts
href={`/vendor/products?edit=${product.id}` as Route}
```

---

# 10. Inventory + Low Stock System

Implemented:
- low stock thresholds
- inventory status calculation
- compact vendor inventory table
- pagination
- inventory filtering
- low/out stock indicators

Document added:

```txt
docs/low-stock-inventory-system.md
```

---

# Final Result

Major overfetch issues resolved across:

- customer app
- driver app
- vendor dashboard
- prescription workflows
- realtime subscriptions

Architecture is now significantly more scalable and bandwidth-efficient.

## Final Git Commands Used

```bash
git add .
git commit -m "Optimize payload usage, inventory flows, and dashboard polish"
git push
```