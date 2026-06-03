create or replace function public.test_assert(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception 'TEST FAILED: %', message;
  end if;
end;
$$;

create or replace function public.test_pass(message text)
returns void
language plpgsql
as $$
begin
  raise notice 'TEST PASSED: %', message;
end;
$$;
