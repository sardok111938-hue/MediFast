select
  tablename,
  policyname,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('prescription_quotes', 'prescription_quote_items')
order by tablename, policyname;