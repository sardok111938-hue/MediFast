-- Driver settlements for MediFast MVP
-- Driver payout target: 5 LYD per completed delivered COD order

create table if not exists public.driver_settlements (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  orders_count bigint not null default 0,
  payout_per_order numeric(10,2) not null default 5.00,
  gross_payout numeric(10,2) not null default 0.00,
  status text not null default 'pending',
  paid_at timestamp with time zone,
  paid_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (driver_id, period_start, period_end)
);

alter table public.driver_settlements enable row level security;

drop policy if exists "admins can manage driver settlements" on public.driver_settlements;
create policy "admins can manage driver settlements"
on public.driver_settlements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.calculate_driver_settlement(
  p_driver_id uuid,
  p_period_start date,
  p_period_end date,
  p_payout_per_order numeric default 5.00
)
returns table (
  driver_id uuid,
  period_start date,
  period_end date,
  orders_count bigint,
  payout_per_order numeric,
  gross_payout numeric
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    p_driver_id,
    p_period_start,
    p_period_end,
    count(o.id)::bigint as orders_count,
    p_payout_per_order::numeric(10,2) as payout_per_order,
    round((count(o.id) * p_payout_per_order), 2)::numeric(10,2) as gross_payout
  from public.orders o
  where o.driver_id = p_driver_id
    and o.order_status = 'delivered'
    and o.payment_status = 'collected'
    and o.delivered_at::date >= p_period_start
    and o.delivered_at::date <= p_period_end;
$function$;

create or replace function public.admin_create_driver_settlement(
  p_driver_id uuid,
  p_period_start date,
  p_period_end date,
  p_payout_per_order numeric default 5.00
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
  from public.calculate_driver_settlement(
    p_driver_id,
    p_period_start,
    p_period_end,
    p_payout_per_order
  );

  insert into public.driver_settlements (
    driver_id,
    period_start,
    period_end,
    orders_count,
    payout_per_order,
    gross_payout,
    status
  )
  values (
    settlement_row.driver_id,
    settlement_row.period_start,
    settlement_row.period_end,
    settlement_row.orders_count,
    settlement_row.payout_per_order,
    settlement_row.gross_payout,
    'pending'
  )
  on conflict (driver_id, period_start, period_end)
  do update set
    orders_count = excluded.orders_count,
    payout_per_order = excluded.payout_per_order,
    gross_payout = excluded.gross_payout,
    updated_at = now()
  returning id into settlement_id;

  return settlement_id;
end;
$function$;

create or replace function public.admin_mark_driver_settlement_paid(
  p_settlement_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  current_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select p.id
  into current_profile_id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;

  update public.driver_settlements
  set
    status = 'paid',
    paid_at = now(),
    paid_by = current_profile_id,
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_settlement_id;
end;
$function$;

grant execute on function public.calculate_driver_settlement(uuid, date, date, numeric) to authenticated;
grant execute on function public.admin_create_driver_settlement(uuid, date, date, numeric) to authenticated;
grant execute on function public.admin_mark_driver_settlement_paid(uuid, text) to authenticated;