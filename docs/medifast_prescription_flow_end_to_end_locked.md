# MediFast Prescription Flow — Locked End-to-End Architecture

## Status

Prescription flow is now fully implemented end-to-end with:

```txt
prescription_request
→ vendor review
→ prescription_quote
→ customer approval
→ create_cod_order_from_quote
→ orders
→ order_items snapshot
→ stock deduction
```

This architecture is production-grade and scalable.

---

# Final Flow

## 1. Customer uploads prescription

Table:

```txt
prescription_requests
```

Stores:

- customer_id
- vendor_id
- prescription image(s)
- customer note
- request status

Statuses:

```txt
pending
accepted
rejected
cancelled
```

---

# 2. Vendor reviews prescription

Vendor dashboard:

```txt
/vendor/prescriptions/[id]
```

Vendor can:

- accept request
- reject request
- create quote items
- send quote

Server-side protected RPCs:

```txt
vendor_upsert_prescription_quote_item
vendor_delete_prescription_quote_item
vendor_send_prescription_quote
```

Quote becomes immutable after send.

---

# 3. Prescription quote

Tables:

```txt
prescription_quotes
prescription_quote_items
```

Quote item structure:

- product_id
- product_name
- quantity
- unit_price
- line_total
- availability_status
- note

Availability statuses:

```txt
available
unavailable
substitute
```

Quote statuses:

```txt
draft
sent
accepted
rejected
expired
```

---

# 4. Customer quote review

Customer app:

```txt
OrderHistoryScreen
```

Customer can:

- view quote
- view subtotal
- view unavailable items
- view vendor note
- accept quote
- reject quote

RPC:

```txt
customer_respond_prescription_quote
```

Rules:

- only sent quotes can be responded to
- response is immutable
- repeat actions blocked

---

# 5. Quote accepted

Accepted quote shows:

```txt
تم قبول العرض
```

Customer can then:

```txt
تأكيد الطلب
```

This calls:

```txt
create_cod_order_from_quote
```

---

# 6. Order conversion

RPC:

```txt
create_cod_order_from_quote
```

Responsibilities:

- validate authenticated customer
- validate accepted quote
- prevent double conversion
- validate pharmacy open hours
- validate delivery radius
- validate stock availability
- calculate delivery fee
- create order
- create immutable order_items snapshot
- deduct stock
- link quote ↔ order
- enqueue notification

---

# 7. Orders

Table:

```txt
orders
```

Important fields:

- prescription_quote_id
- subtotal
- delivery_fee
- total
- payment_method
- payment_status
- order_status

Order status starts:

```txt
placed
```

Payment:

```txt
cash_on_delivery
pending
```

---

# 8. Snapshot architecture

Table:

```txt
order_items
```

Critical design:

```txt
quote items
→ copied into immutable order_items snapshot
```

This guarantees:

- historical pricing preserved
- future product edits do not affect orders
- future product deletion does not break old orders
- accounting consistency

This is the correct marketplace architecture.

---

# 9. Post-conversion UX

After conversion:

Quote stores:

```txt
converted_order_id
converted_to_order_at
```

Customer UI switches from:

```txt
تأكيد الطلب
```

To:

```txt
عرض الطلب
```

Preventing duplicate conversion.

---

# Server-side protections

Implemented protections:

## Quote protections

- cannot edit sent quote
- cannot edit accepted quote
- cannot edit rejected quote
- cannot delete non-draft quote items
- cannot resend already sent quote

## Customer protections

- cannot respond twice
- cannot convert twice
- cannot convert non-accepted quote

## Order protections

- stock validated before conversion
- pharmacy availability validated
- delivery radius validated
- immutable order snapshot

---

# Current Scope

Implemented:

✅ prescription upload
✅ vendor review
✅ quote builder
✅ quote send
✅ customer quote view
✅ accept/reject
✅ quote → order conversion
✅ stock deduction
✅ order snapshots
✅ delivery fee calculation
✅ order linking
✅ customer navigation

Not implemented yet:

```txt
payment gateway
multi-vendor prescription splitting
partial fulfillment
driver prescription-specific UX
quote expiration automation
prescription chat
OCR extraction
insurance handling
```

---

# Key Files

## Customer app

```txt
apps/customer-app/src/lib/prescription-requests.ts
apps/customer-app/src/features/orders/OrderHistoryScreen.tsx
```

## Vendor dashboard

```txt
apps/dashboard/app/(protected)/vendor/prescriptions/[id]/page.tsx
apps/dashboard/src/features/orders/api.ts
```

## Database

```txt
prescription_requests
prescription_quotes
prescription_quote_items
orders
order_items
```

Core RPCs:

```txt
vendor_upsert_prescription_quote_item
vendor_delete_prescription_quote_item
vendor_send_prescription_quote
customer_respond_prescription_quote
create_cod_order_from_quote
```

---

# Final Architecture Verdict

This prescription system is now:

```txt
scalable
marketplace-safe
snapshot-safe
COD-compatible
future multi-vendor compatible
production-grade
```

The core prescription lifecycle for MediFast is now locked.

