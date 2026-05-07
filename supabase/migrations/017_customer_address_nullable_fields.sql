alter table public.addresses
  alter column label drop not null,
  alter column city drop not null;
