create table if not exists public.vendor_settlements (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,

  period_start date not null,
  period_end date not null,

  gross_sales numeric(10,2) not null default 0,
  commission_rate numeric(5,2) not null default 5.00,
  commission_amount numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,

  status text not null default 'pending',
  paid_at timestamptz,
  paid_by uuid references public.profiles(id),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint vendor_settlements_status_check
    check (status in ('pending', 'paid', 'cancelled')),

  constraint vendor_settlements_period_check
    check (period_end >= period_start),

  constraint vendor_settlements_unique_period
    unique (vendor_id, period_start, period_end)
);

create index if not exists vendor_settlements_vendor_id_idx
on public.vendor_settlements(vendor_id);

create index if not exists vendor_settlements_status_idx
on public.vendor_settlements(status);

create index if not exists vendor_settlements_period_idx
on public.vendor_settlements(period_start, period_end);

alter table public.vendor_settlements enable row level security;

drop policy if exists "Admins can manage vendor settlements" on public.vendor_settlements;
create policy "Admins can manage vendor settlements"
on public.vendor_settlements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Vendors can read own settlements" on public.vendor_settlements;
create policy "Vendors can read own settlements"
on public.vendor_settlements
for select
to authenticated
using (vendor_id = public.get_vendor_id());

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
  net_amount numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p_vendor_id,
    p_period_start,
    p_period_end,
    count(o.id)::bigint as orders_count,
    coalesce(sum(o.subtotal), 0)::numeric(10,2) as gross_sales,
    p_commission_rate::numeric(5,2) as commission_rate,
    round((coalesce(sum(o.subtotal), 0) * p_commission_rate / 100), 2)::numeric(10,2) as commission_amount,
    round((coalesce(sum(o.subtotal), 0) - (coalesce(sum(o.subtotal), 0) * p_commission_rate / 100)), 2)::numeric(10,2) as net_amount
  from public.orders o
  where o.vendor_id = p_vendor_id
    and o.order_status = 'delivered'
    and o.payment_status = 'collected'
    and o.created_at::date >= p_period_start
    and o.created_at::date <= p_period_end;
$$;

grant execute on function public.calculate_vendor_settlement(uuid, date, date, numeric) to authenticated;

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
as $$
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
    settlement_row.net_amount,
    'pending'
  )
  on conflict (vendor_id, period_start, period_end)
  do update set
    gross_sales = excluded.gross_sales,
    commission_rate = excluded.commission_rate,
    commission_amount = excluded.commission_amount,
    net_amount = excluded.net_amount,
    updated_at = now()
  returning id into settlement_id;

  return settlement_id;
end;
$$;

grant execute on function public.admin_create_vendor_settlement(uuid, date, date, numeric) to authenticated;

create or replace function public.admin_mark_vendor_settlement_paid(
  p_settlement_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select id
  into admin_profile_id
  from public.profiles
  where auth_user_id = auth.uid()
  limit 1;

  update public.vendor_settlements
  set
    status = 'paid',
    paid_at = now(),
    paid_by = admin_profile_id,
    notes = coalesce(p_notes, notes),
    updated_at = now()
  where id = p_settlement_id;
end;
$$;

grant execute on function public.admin_mark_vendor_settlement_paid(uuid, text) to authenticated;
