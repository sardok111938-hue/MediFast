drop function if exists public.calculate_vendor_settlement(uuid, date, date, numeric);

create or replace function public.calculate_vendor_settlement(
  p_vendor_id uuid,
  p_period_start date,
  p_period_end date,
  p_commission_rate numeric default 5.00
)
returns table (
  vendor_id uuid,
  period_start date,
  period_end date,
  orders_count bigint,
  gross_sales numeric,
  commission_rate numeric,
  commission_amount numeric,
  delivery_margin_amount numeric,
  net_amount numeric
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    p_vendor_id,
    p_period_start,
    p_period_end,
    count(o.id)::bigint as orders_count,
    coalesce(sum(o.subtotal), 0)::numeric(10,2) as gross_sales,
    p_commission_rate::numeric(5,2) as commission_rate,
    round((coalesce(sum(o.subtotal), 0) * p_commission_rate / 100), 2)::numeric(10,2) as commission_amount,
    round((count(o.id) * 2.00), 2)::numeric(10,2) as delivery_margin_amount,
    round(
      coalesce(sum(o.subtotal), 0)
      - (coalesce(sum(o.subtotal), 0) * p_commission_rate / 100)
      - (count(o.id) * 2.00),
      2
    )::numeric(10,2) as net_amount
  from public.orders o
  where o.vendor_id = p_vendor_id
    and o.order_status = 'delivered'
    and o.payment_status = 'collected'
    and o.delivered_at::date >= p_period_start
    and o.delivered_at::date <= p_period_end;
$function$;

grant execute on function public.calculate_vendor_settlement(uuid, date, date, numeric) to authenticated;
