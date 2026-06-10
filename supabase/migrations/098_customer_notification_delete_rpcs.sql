create or replace function public.delete_customer_notification(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_customer_id uuid;
begin
  current_customer_id := public.get_customer_id();

  if current_customer_id is null then
    raise exception 'Customer account is not linked correctly.';
  end if;

  delete from public.notifications
  where id = p_notification_id
    and recipient_role = 'customer'
    and recipient_id = current_customer_id;
end;
$$;

grant execute on function public.delete_customer_notification(uuid)
to authenticated;

create or replace function public.delete_customer_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_customer_id uuid;
begin
  current_customer_id := public.get_customer_id();

  if current_customer_id is null then
    raise exception 'Customer account is not linked correctly.';
  end if;

  delete from public.notifications
  where recipient_role = 'customer'
    and recipient_id = current_customer_id;
end;
$$;

grant execute on function public.delete_customer_notifications()
to authenticated;