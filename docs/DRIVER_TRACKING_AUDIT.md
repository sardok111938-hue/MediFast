# Driver Tracking Audit

## Current State

- Driver location stored on driver record
- No order-level live tracking
- `delivery_tracking` table reserved for future implementation
- Customer tracking limited to order status updates

## Decision

Defer live GPS tracking until after core marketplace stabilization.

## Rationale

Current MVP workflow is fully supported through status updates:

ready_for_pickup
→ assigned
→ on_the_way
→ delivered

This provides sufficient customer visibility without introducing:

- Additional RLS complexity
- Driver GPS privacy concerns
- Background location tracking requirements
- Increased battery usage
- Realtime scaling considerations

The existing `delivery_tracking` table and realtime infrastructure remain available for future implementation.