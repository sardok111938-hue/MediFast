-- Add MediFast delivery margin to vendor settlements
-- Cash model:
-- Customer -> Driver -> Vendor
-- Vendor settles with MediFast weekly:
-- 5% commission + 3 LYD delivery margin per delivered order

alter table public.vendor_settlements
  add column if not exists delivery_margin_amount numeric(10,2) not null default 0;

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
    round((count(o.id) * 3.00), 2)::numeric(10,2) as delivery_margin_amount,
    round(
      coalesce(sum(o.subtotal), 0)
      - (coalesce(sum(o.subtotal), 0) * p_commission_rate / 100)
      - (count(o.id) * 3.00),
      2
    )::numeric(10,2) as net_amount
  from public.orders o
  where o.vendor_id = p_vendor_id
    and o.order_status = 'delivered'
    and o.payment_status = 'collected'
    and o.created_at::date >= p_period_start
    and o.created_at::date <= p_period_end;
$function$;

create or replace function public.admin_create_vendor_settlement(
  p_vendor_id uuid,
  p_period_start date,
  p_period_end date,
  p_commission_rate numeric default 5.00
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  settlement_id uuid;
  settlement_row record;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select *
  into settlement_row
  from public.calculate_vendor_settlement(
    p_vendor_id,
    p_period_start,
    p_period_end,
    p_commission_rate
  );

  insert into public.vendor_settlements (
    vendor_id,
    period_start,
    period_end,
    gross_sales,
    commission_rate,
    commission_amount,
    delivery_margin_amount,
    net_amount,
    status
  )
  values (
    settlement_row.vendor_id,
    settlement_row.period_start,
    settlement_row.period_end,
    settlement_row.gross_sales,
    settlement_row.commission_rate,
    settlement_row.commission_amount,
    settlement_row.delivery_margin_amount,
    settlement_row.net_amount,
    'pending'
  )
  on conflict (vendor_id, period_start, period_end)
  do update set
    gross_sales = excluded.gross_sales,
    commission_rate = excluded.commission_rate,
    commission_amount = excluded.commission_amount,
    delivery_margin_amount = excluded.delivery_margin_amount,
    net_amount = excluded.net_amount,
    updated_at = now()
  returning id into settlement_id;

  return settlement_id;
end;
$function$;

grant execute on function public.calculate_vendor_settlement(uuid, date, date, numeric) to authenticated;
grant execute on function public.admin_create_vendor_settlement(uuid, date, date, numeric) to authenticated;