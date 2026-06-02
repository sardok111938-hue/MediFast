alter table public.categories
add column if not exists name_ar text;

update public.categories
set name_ar = case trim(name)
  when 'Medicine' then 'الأدوية'
  when 'Vitamins' then 'الفيتامينات'
  when 'Skin Care' then 'العناية بالبشرة'
  when 'Medical Devices' then 'الأجهزة الطبية'
  when 'Baby Care' then 'العناية بالطفل'
  when 'Personal Care' then 'العناية الشخصية'
  else name_ar
end
where coalesce(nullif(trim(name_ar), ''), '') = '';

create or replace function public.admin_create_category(
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_create_category(p_name, null::text);
end;
$$;

grant execute on function public.admin_create_category(text) to authenticated;

create or replace function public.admin_create_category(
  p_name text,
  p_name_ar text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_category_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  insert into public.categories (name, name_ar)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_name_ar, '')), '')
  )
  returning id into resolved_category_id;

  return resolved_category_id;
end;
$$;

grant execute on function public.admin_create_category(text, text) to authenticated;

create or replace function public.admin_update_category(
  p_category_id uuid,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.admin_update_category(p_category_id, p_name, null::text);
end;
$$;

grant execute on function public.admin_update_category(uuid, text) to authenticated;

create or replace function public.admin_update_category(
  p_category_id uuid,
  p_name text,
  p_name_ar text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_category_id uuid;
begin
  if not public.is_current_user_admin() then
    raise exception 'Admin access is required.';
  end if;

  if p_category_id is null then
    raise exception 'Category is required.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  update public.categories
  set
    name = trim(p_name),
    name_ar = nullif(trim(coalesce(p_name_ar, '')), '')
  where id = p_category_id
  returning id into resolved_category_id;

  if resolved_category_id is null then
    raise exception 'Category was not found.';
  end if;

  return resolved_category_id;
end;
$$;

grant execute on function public.admin_update_category(uuid, text, text) to authenticated;
