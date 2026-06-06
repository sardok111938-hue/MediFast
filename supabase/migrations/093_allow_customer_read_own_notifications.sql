alter table public.notifications enable row level security;

drop policy if exists "Customers can read own notifications"
on public.notifications;

create policy "Customers can read own notifications"
on public.notifications
for select
to authenticated
using (
  recipient_role = 'customer'
  and recipient_id = public.get_customer_id()
);