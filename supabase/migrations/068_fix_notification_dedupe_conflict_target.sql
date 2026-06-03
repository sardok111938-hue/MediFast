create or replace function public.enqueue_order_notification(
  p_recipient_role text,
  p_recipient_id uuid,
  p_order_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_id uuid;
  dedupe_key_value text;
begin
  if p_recipient_role is null
     or p_recipient_id is null
     or p_order_id is null
     or nullif(trim(p_title), '') is null
     or nullif(trim(p_body), '') is null then
    raise exception 'Notification recipient, order, title and body are required.';
  end if;

  dedupe_key_value := concat_ws(
    ':',
    p_recipient_role,
    p_recipient_id::text,
    p_order_id::text,
    coalesce(p_data->>'event', p_title)
  );

  insert into public.notifications (
    recipient_role,
    recipient_id,
    order_id,
    title,
    body,
    data,
    dedupe_key,
    status
  )
  values (
    p_recipient_role,
    p_recipient_id,
    p_order_id,
    nullif(trim(p_title), ''),
    nullif(trim(p_body), ''),
    coalesce(p_data, '{}'::jsonb),
    dedupe_key_value,
    'queued'
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing
  returning id into notification_id;

  return notification_id;
end;
$$;

grant execute on function public.enqueue_order_notification(text, uuid, uuid, text, text, jsonb) to authenticated;
