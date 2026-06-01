create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create table if not exists public.prescription_quotes (
  id uuid primary key default gen_random_uuid(),
  prescription_request_id uuid not null references public.prescription_requests(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  vendor_note text,
  customer_note text,
  subtotal numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.prescription_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.prescription_quotes(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  line_total numeric(10, 2) not null default 0 check (line_total >= 0),
  availability_status text not null default 'available' check (availability_status in ('available', 'unavailable', 'substitute')),
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists prescription_quotes_request_unique
  on public.prescription_quotes (prescription_request_id);
create index if not exists idx_prescription_quotes_vendor on public.prescription_quotes(vendor_id);
create index if not exists idx_prescription_quotes_customer on public.prescription_quotes(customer_id);
create index if not exists idx_prescription_quote_items_quote on public.prescription_quote_items(quote_id);

alter table public.prescription_quotes enable row level security;
alter table public.prescription_quote_items enable row level security;

grant select, insert, update on public.prescription_quotes to authenticated;
grant select, insert, update, delete on public.prescription_quote_items to authenticated;

drop policy if exists "vendors can select own prescription quotes" on public.prescription_quotes;
create policy "vendors can select own prescription quotes"
on public.prescription_quotes
for select
to authenticated
using (vendor_id = public.get_vendor_id());

drop policy if exists "vendors can insert own prescription quotes" on public.prescription_quotes;
create policy "vendors can insert own prescription quotes"
on public.prescription_quotes
for insert
to authenticated
with check (vendor_id = public.get_vendor_id());

drop policy if exists "vendors can update own prescription quotes" on public.prescription_quotes;
create policy "vendors can update own prescription quotes"
on public.prescription_quotes
for update
to authenticated
using (vendor_id = public.get_vendor_id())
with check (vendor_id = public.get_vendor_id());

drop policy if exists "customers can select own prescription quotes" on public.prescription_quotes;
create policy "customers can select own prescription quotes"
on public.prescription_quotes
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "customers can respond to own prescription quotes" on public.prescription_quotes;
create policy "customers can respond to own prescription quotes"
on public.prescription_quotes
for update
to authenticated
using (customer_id = public.get_customer_id())
with check (
  customer_id = public.get_customer_id()
  and status in ('accepted', 'rejected')
);

drop policy if exists "admins can select all prescription quotes" on public.prescription_quotes;
create policy "admins can select all prescription quotes"
on public.prescription_quotes
for select
to authenticated
using (public.is_admin());

drop policy if exists "vendors can select own prescription quote items" on public.prescription_quote_items;
create policy "vendors can select own prescription quote items"
on public.prescription_quote_items
for select
to authenticated
using (
  exists (
    select 1
    from public.prescription_quotes q
    where q.id = quote_id
      and q.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "vendors can insert own prescription quote items" on public.prescription_quote_items;
create policy "vendors can insert own prescription quote items"
on public.prescription_quote_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.prescription_quotes q
    where q.id = quote_id
      and q.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "vendors can update own prescription quote items" on public.prescription_quote_items;
create policy "vendors can update own prescription quote items"
on public.prescription_quote_items
for update
to authenticated
using (
  exists (
    select 1
    from public.prescription_quotes q
    where q.id = quote_id
      and q.vendor_id = public.get_vendor_id()
  )
)
with check (
  exists (
    select 1
    from public.prescription_quotes q
    where q.id = quote_id
      and q.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "vendors can delete own prescription quote items" on public.prescription_quote_items;
create policy "vendors can delete own prescription quote items"
on public.prescription_quote_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.prescription_quotes q
    where q.id = quote_id
      and q.vendor_id = public.get_vendor_id()
  )
);

drop policy if exists "customers can select own prescription quote items" on public.prescription_quote_items;
create policy "customers can select own prescription quote items"
on public.prescription_quote_items
for select
to authenticated
using (
  exists (
    select 1
    from public.prescription_quotes q
    where q.id = quote_id
      and q.customer_id = public.get_customer_id()
  )
);

drop policy if exists "admins can select all prescription quote items" on public.prescription_quote_items;
create policy "admins can select all prescription quote items"
on public.prescription_quote_items
for select
to authenticated
using (public.is_admin());

drop function if exists public.recalculate_prescription_quote_subtotal(uuid);

create or replace function public.recalculate_prescription_quote_subtotal(p_quote_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.prescription_quotes q
  set
    subtotal = coalesce((
      select sum(i.line_total)
      from public.prescription_quote_items i
      where i.quote_id = p_quote_id
    ), 0),
    updated_at = now()
  where q.id = p_quote_id;
end;
$$;

drop function if exists public.vendor_create_prescription_quote(uuid);

create or replace function public.vendor_create_prescription_quote(
  p_prescription_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  request_row public.prescription_requests%rowtype;
  quote_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  select *
  into request_row
  from public.prescription_requests pr
  where pr.id = p_prescription_request_id
    and pr.vendor_id = current_vendor_id
  for update;

  if not found then
    raise exception 'Prescription request was not found for this vendor.';
  end if;

  if request_row.status <> 'accepted' then
    raise exception 'A quote can be created only after accepting the prescription.';
  end if;

  insert into public.prescription_quotes (
    prescription_request_id,
    vendor_id,
    customer_id,
    status,
    vendor_note
  )
  values (
    request_row.id,
    request_row.vendor_id,
    request_row.customer_id,
    'draft',
    request_row.vendor_note
  )
  on conflict (prescription_request_id)
  do update set updated_at = public.prescription_quotes.updated_at
  returning id into quote_id;

  return quote_id;
end;
$$;

drop function if exists public.vendor_upsert_prescription_quote_item(uuid, uuid, uuid, text, integer, numeric, text, text);

create or replace function public.vendor_upsert_prescription_quote_item(
  p_quote_id uuid,
  p_item_id uuid,
  p_product_id uuid,
  p_product_name text,
  p_quantity integer,
  p_unit_price numeric,
  p_availability_status text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  quote_row public.prescription_quotes%rowtype;
  product_row public.products%rowtype;
  resolved_status text;
  resolved_name text;
  resolved_quantity integer;
  resolved_unit_price numeric(10, 2);
  resolved_line_total numeric(10, 2);
  saved_item_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  select *
  into quote_row
  from public.prescription_quotes q
  where q.id = p_quote_id
    and q.vendor_id = current_vendor_id
  for update;

  if not found then
    raise exception 'Quote was not found for this vendor.';
  end if;

  if quote_row.status <> 'draft' then
    raise exception 'Only draft quotes can be edited.';
  end if;

  resolved_status := trim(coalesce(p_availability_status, 'available'));

  if resolved_status not in ('available', 'unavailable', 'substitute') then
    raise exception 'Invalid quote item availability status.';
  end if;

  if p_product_id is not null then
    select *
    into product_row
    from public.products p
    where p.id = p_product_id
      and p.vendor_id = current_vendor_id;

    if not found then
      raise exception 'Product was not found for this vendor.';
    end if;
  end if;

  resolved_name := coalesce(nullif(trim(p_product_name), ''), product_row.name);

  if resolved_name is null or trim(resolved_name) = '' then
    raise exception 'Product name is required.';
  end if;

  resolved_quantity := greatest(coalesce(p_quantity, 1), 1);
  resolved_unit_price := greatest(coalesce(p_unit_price, product_row.price, 0), 0);

  if resolved_status = 'unavailable' then
    resolved_unit_price := 0;
  end if;

  resolved_line_total := round(resolved_quantity * resolved_unit_price, 2);

  if p_item_id is null then
    insert into public.prescription_quote_items (
      quote_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total,
      availability_status,
      note
    )
    values (
      quote_row.id,
      p_product_id,
      resolved_name,
      resolved_quantity,
      resolved_unit_price,
      resolved_line_total,
      resolved_status,
      nullif(trim(coalesce(p_note, '')), '')
    )
    returning id into saved_item_id;
  else
    update public.prescription_quote_items i
    set
      product_id = p_product_id,
      product_name = resolved_name,
      quantity = resolved_quantity,
      unit_price = resolved_unit_price,
      line_total = resolved_line_total,
      availability_status = resolved_status,
      note = nullif(trim(coalesce(p_note, '')), '')
    where i.id = p_item_id
      and i.quote_id = quote_row.id
    returning i.id into saved_item_id;

    if saved_item_id is null then
      raise exception 'Quote item was not found for this quote.';
    end if;
  end if;

  perform public.recalculate_prescription_quote_subtotal(quote_row.id);

  return saved_item_id;
end;
$$;

drop function if exists public.vendor_delete_prescription_quote_item(uuid);

create or replace function public.vendor_delete_prescription_quote_item(
  p_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  quote_id uuid;
  deleted_item_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  select i.quote_id
  into quote_id
  from public.prescription_quote_items i
  join public.prescription_quotes q on q.id = i.quote_id
  where i.id = p_item_id
    and q.vendor_id = current_vendor_id
    and q.status = 'draft';

  if quote_id is null then
    raise exception 'Quote item was not found for an editable quote.';
  end if;

  delete from public.prescription_quote_items i
  where i.id = p_item_id
  returning i.id into deleted_item_id;

  perform public.recalculate_prescription_quote_subtotal(quote_id);

  return deleted_item_id;
end;
$$;

drop function if exists public.vendor_send_prescription_quote(uuid);

create or replace function public.vendor_send_prescription_quote(
  p_quote_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
  item_count integer;
  sent_quote_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  select count(*)
  into item_count
  from public.prescription_quote_items i
  join public.prescription_quotes q on q.id = i.quote_id
  where q.id = p_quote_id
    and q.vendor_id = current_vendor_id
    and q.status = 'draft';

  if item_count = 0 then
    raise exception 'Quote must include at least one item before sending.';
  end if;

  update public.prescription_quotes q
  set
    status = 'sent',
    updated_at = now()
  where q.id = p_quote_id
    and q.vendor_id = current_vendor_id
    and q.status = 'draft'
  returning q.id into sent_quote_id;

  if sent_quote_id is null then
    raise exception 'Quote was not found for this vendor.';
  end if;

  return sent_quote_id;
end;
$$;

drop function if exists public.customer_respond_prescription_quote(uuid, text, text);

create or replace function public.customer_respond_prescription_quote(
  p_quote_id uuid,
  p_response text,
  p_customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_customer_id uuid;
  resolved_response text;
  saved_quote_id uuid;
begin
  current_customer_id := public.get_customer_id();

  if current_customer_id is null then
    raise exception 'Customer account is not linked correctly.';
  end if;

  resolved_response := trim(coalesce(p_response, ''));

  if resolved_response not in ('accepted', 'rejected') then
    raise exception 'Invalid quote response.';
  end if;

  update public.prescription_quotes q
  set
    status = resolved_response,
    customer_note = nullif(trim(coalesce(p_customer_note, '')), ''),
    accepted_at = case when resolved_response = 'accepted' then now() else null end,
    updated_at = now()
  where q.id = p_quote_id
    and q.customer_id = current_customer_id
    and q.status = 'sent'
  returning q.id into saved_quote_id;

  if saved_quote_id is null then
    raise exception 'Quote was not found or cannot be answered.';
  end if;

  return saved_quote_id;
end;
$$;

grant execute on function public.vendor_create_prescription_quote(uuid) to authenticated;
grant execute on function public.vendor_upsert_prescription_quote_item(uuid, uuid, uuid, text, integer, numeric, text, text) to authenticated;
grant execute on function public.vendor_delete_prescription_quote_item(uuid) to authenticated;
grant execute on function public.vendor_send_prescription_quote(uuid) to authenticated;
grant execute on function public.customer_respond_prescription_quote(uuid, text, text) to authenticated;

alter publication supabase_realtime add table public.prescription_quotes;
alter publication supabase_realtime add table public.prescription_quote_items;
