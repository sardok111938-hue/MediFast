alter table public.prescription_requests
  add column if not exists vendor_note text;

grant select on public.prescription_requests to authenticated;
grant update (vendor_note, updated_at) on public.prescription_requests to authenticated;

drop policy if exists "customers can select own prescription requests" on public.prescription_requests;
create policy "customers can select own prescription requests"
on public.prescription_requests
for select
to authenticated
using (customer_id = public.get_customer_id());

drop policy if exists "vendors can select own prescription requests" on public.prescription_requests;
create policy "vendors can select own prescription requests"
on public.prescription_requests
for select
to authenticated
using (vendor_id = public.get_vendor_id());

create or replace function public.vendor_update_prescription_note(
  p_request_id uuid,
  p_vendor_note text
)
returns table (
  request_id uuid,
  vendor_note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_vendor_id uuid;
begin
  current_vendor_id := public.get_vendor_id();

  if current_vendor_id is null then
    raise exception 'Vendor account is not linked correctly.';
  end if;

  return query
  update public.prescription_requests pr
  set
    vendor_note = nullif(trim(coalesce(p_vendor_note, '')), ''),
    updated_at = now()
  where pr.id = p_request_id
    and pr.vendor_id = current_vendor_id
  returning pr.id, pr.vendor_note;
end;
$$;

grant execute on function public.vendor_update_prescription_note(uuid, text) to authenticated;
