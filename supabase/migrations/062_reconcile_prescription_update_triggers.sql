drop trigger if exists set_prescription_quotes_updated_at on public.prescription_quotes;
create trigger set_prescription_quotes_updated_at
before update on public.prescription_quotes
for each row
execute function public.set_prescription_quotes_updated_at();

drop trigger if exists prescription_requests_set_updated_at on public.prescription_requests;
create trigger prescription_requests_set_updated_at
before update on public.prescription_requests
for each row
execute function public.set_prescription_requests_updated_at();
