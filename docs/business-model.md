# MediFast Business Model (MVP)

## Delivery Economics

### Customer Delivery Fee

Fixed delivery fee:

```text
7 LYD


### Delivery Radius

* Platform maximum radius: 10 km
* Default vendor radius: 10 km
* Orders outside the allowed radius are rejected during checkout

### Driver Compensation

* Driver payout target: 7 LYD per completed delivery
* Driver settlements are currently managed manually
* Future versions may automate driver settlement calculations

### MediFast Delivery Margin

Per completed delivery:

* Customer pays: 10 LYD
* Driver receives: 7 LYD
* MediFast retains: 3 LYD

## Vendor Economics

### Commission

* Vendor commission: 5% of medicine subtotal
* Commission excludes delivery fee

### Example

Medicine subtotal: 100 LYD

Delivery fee: 10 LYD

Customer pays: 110 LYD

Vendor receives:

* 100 - 5% = 95 LYD

Driver receives:

* 7 LYD

MediFast receives:

* 5 LYD vendor commission
* 3 LYD delivery margin

Total MediFast revenue:

* 8 LYD

## Current MVP Decisions

Implemented:

* Fixed delivery pricing
* 10 km delivery radius
* Vendor settlements
* Server-side delivery radius enforcement
* Server-side delivery fee calculation

Deferred:

* Automated driver settlements
* Driver earnings dashboard
* Live GPS order tracking
* Dynamic distance-based pricing

## Source of Truth

### Platform Settings

```json
{
  "base_fee": 10,
  "per_km_fee": 0,
  "max_radius_km": 10
}
```

### Database Function

`public.calculate_delivery_fee(distance_km)`

Returns:

```text
10.00
```

for all valid deliveries.
