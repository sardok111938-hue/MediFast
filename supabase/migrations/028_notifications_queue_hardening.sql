alter table public.customers
add column if not exists expo_push_token text;

alter table public.drivers
add column if not exists expo_push_token text;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_role text not null,
  recipient_id uuid not null,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  dedupe_key text,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.notifications
enable row level security;

alter table public.notifications
add column if not exists recipient_role text,
add column if not exists recipient_id uuid,
add column if not exists order_id uuid references public.orders(id) on delete cascade,
add column if not exists title text,
add column if not exists body text,
add column if not exists data jsonb not null default '{}'::jsonb,
add column if not exists dedupe_key text,
add column if not exists status text not null default 'queued',
add column if not exists sent_at timestamptz,
add column if not exists error_message text,
add column if not exists created_at timestamptz not null default now();

alter table public.notifications
add column if not exists attempt_count integer not null default 0,
add column if not exists last_attempt_at timestamptz;

alter table public.notifications
drop constraint if exists notifications_attempt_count_check;

alter table public.notifications
add constraint notifications_attempt_count_check
check (attempt_count >= 0);

alter table public.notifications
drop constraint if exists notifications_status_check;

alter table public.notifications
add constraint notifications_status_check
check (status in ('queued', 'processing', 'sent', 'failed'));

alter table public.notifications
drop constraint if exists notifications_recipient_role_check;

alter table public.notifications
add constraint notifications_recipient_role_check
check (recipient_role in ('customer', 'driver'));

create index if not exists notifications_queue_idx
on public.notifications (status, created_at)
where status = 'queued';

create index if not exists notifications_processing_idx
on public.notifications (status, last_attempt_at)
where status = 'processing';

create index if not exists notifications_order_idx
on public.notifications (order_id, recipient_role, recipient_id);

drop index if exists notifications_dedupe_key_unique_idx;

create unique index if not exists notifications_dedupe_key_unique_idx
on public.notifications (dedupe_key)
where dedupe_key is not null;