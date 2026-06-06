# Marketplace Product Discovery Rules

## Purpose

Keep product discovery scalable as the number of pharmacies grows while preserving price comparison across the marketplace.

---

## Global Search

Path:

Customer → Search

Behavior:

* Search across all pharmacies.
* Products are grouped into a single marketplace listing.
* Grouping is based on normalized product identity.
* Customer sees one product card only.

Example:

بنادول إكسترا

* يبدأ من 3.67 د.ل
* متوفر في 4 صيدليات

Navigation:

Search Result
→ Grouped Product Page
→ Compare Pharmacies

---

## Grouped Product Page

Purpose:

Compare the same product across multiple pharmacies.

Behavior:

* Show pharmacy offers sorted by:

  * Open pharmacies first
  * Lowest price
  * Nearest distance

* Initially show:

  * Top 3 offers only

* If additional pharmacies exist:

  * Show "عرض المزيد من الصيدليات"

* When the customer taps "عرض المزيد من الصيدليات":

  * Remaining offers are revealed without leaving the page.

Example:

بنادول إكسترا

1. الحكمة
2. الخضراء
3. ميزران

[عرض المزيد من الصيدليات]

---

## Pharmacy Storefront

Path:

Customer
→ Pharmacy
→ Category
→ Product

Behavior:

* Show only products belonging to that pharmacy.
* Do not group products across pharmacies.
* Product opens directly to product-detail.

Navigation:

Pharmacy Product
→ Product Detail

NOT:

Pharmacy Product
→ Grouped Comparison

Reason:

Customer has already chosen a pharmacy.

---

## Global Categories

Path:

Customer
→ Category

Behavior:

* Marketplace-wide browsing.
* Products are grouped.
* Duplicate products from multiple pharmacies appear only once.

Navigation:

Category Product
→ Grouped Product Page

---

## Pharmacy Categories

Path:

Customer
→ Pharmacy
→ Category

Behavior:

* Products remain ungrouped.
* Only products from selected pharmacy are shown.

Navigation:

Category Product
→ Product Detail

---

## Scalability Goal

Supports:

* 10 pharmacies
* 100 pharmacies
* 1000+ pharmacies

without flooding search results with duplicate products.

Search remains product-centric.

Comparison happens only after selecting a product.
