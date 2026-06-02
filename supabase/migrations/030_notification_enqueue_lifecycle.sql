drop function if exists public.enqueue_order_notification(text, uuid, uuid, text, text, jsonb);

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
  normalized_role text;
  normalized_title text;
  normalized_body text;
  normalized_data jsonb;
  notification_id uuid;
  notification_dedupe_key text;
begin
  normalized_role := trim(coalesce(p_recipient_role, ''));
  normalized_title := trim(coalesce(p_title, ''));
  normalized_body := trim(coalesce(p_body, ''));
  normalized_data := coalesce(p_data, '{}'::jsonb);

  if normalized_role not in ('customer', 'driver') then
    raise exception 'Unsupported notification recipient role: %.', normalized_role;
  end if;

  if p_recipient_id is null then
    raise exception 'Notification recipient id is required.';
  end if;

  if normalized_title = '' or normalized_body = '' then
    raise exception 'Notification title and body are required.';
  end if;

  notification_dedupe_key := md5(concat_ws(
    '|',
    normalized_role,
    p_recipient_id::text,
    coalesce(p_order_id::text, ''),
    coalesce(normalized_data->>'event', normalized_title)
  ));

  with inserted as (
    insert into public.notifications (
      recipient_role,
      recipient_id,
      order_id,
      title,
      body,
      data,
      dedupe_key
    )
    values (
      normalized_role,
      p_recipient_id,
      p_order_id,
      normalized_title,
      normalized_body,
      normalized_data,
      notification_dedupe_key
    )
    on conflict (dedupe_key)
    where dedupe_key is not null
    do nothing
    returning id
    
  ), selected_notification as (
    select id
    from inserted
    union all
    select n.id
    from public.notifications n
    where n.dedupe_key = notification_dedupe_key
    limit 1
  )
  select id
  into notification_id
  from selected_notification;

  return notification_id;
end;
$$;

revoke all on function public.enqueue_order_notification(text, uuid, uuid, text, text, jsonb) from public;
revoke all on function public.enqueue_order_notification(text, uuid, uuid, text, text, jsonb) from anon;
revoke all on function public.enqueue_order_notification(text, uuid, uuid, text, text, jsonb) from authenticated;
