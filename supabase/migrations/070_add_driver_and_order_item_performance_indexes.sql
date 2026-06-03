create index if not exists order_items_order_id_idx
on public.order_items (order_id);

create index if not exists orders_ready_for_pickup_unassigned_idx
on public.orders (created_at)
where order_status = 'ready_for_pickup'
  and driver_id is null;
