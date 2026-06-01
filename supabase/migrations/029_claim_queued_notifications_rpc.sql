drop function if exists public.claim_queued_notifications(integer);

create or replace function public.claim_queued_notifications(p_limit integer default 20)
returns setof public.notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set
    status = 'queued',
    error_message = coalesce(error_message, 'Recovered stale processing notification.')
  where status = 'processing'
    and attempt_count < 3
    and last_attempt_at < now() - interval '10 minutes';

  update public.notifications
  set
    status = 'failed',
    error_message = coalesce(error_message, 'Notification processing timed out after maximum attempts.')
  where status = 'processing'
    and attempt_count >= 3
    and last_attempt_at < now() - interval '10 minutes';

  return query
  update public.notifications n
  set
    status = 'processing',
    attempt_count = n.attempt_count + 1,
    last_attempt_at = now(),
    error_message = null
  where n.id in (
    select q.id
    from public.notifications q
    where q.status = 'queued'
      and q.attempt_count < 3
    order by q.created_at asc
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  returning n.*;
end;
$$;
