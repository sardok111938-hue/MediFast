alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null,
  add column if not exists slug text,
  add column if not exists image_url text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_active boolean not null default true;

create unique index if not exists categories_slug_unique_not_null
  on public.categories (slug)
  where slug is not null;

create or replace function public.admin_create_category(
  p_name text,
  p_name_ar text default null,
  p_slug text default null,
  p_icon text default null,
  p_image_url text default null,
  p_sort_order integer default 0,
  p_is_active boolean default true,
  p_parent_id uuid default null
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

  insert into public.categories (
    name,
    name_ar,
    slug,
    icon,
    image_url,
    sort_order,
    is_active,
    parent_id
  )
  values (
    trim(p_name),
    nullif(trim(coalesce(p_name_ar, '')), ''),
    nullif(trim(coalesce(p_slug, '')), ''),
    nullif(trim(coalesce(p_icon, '')), ''),
    nullif(trim(coalesce(p_image_url, '')), ''),
    coalesce(p_sort_order, 0),
    coalesce(p_is_active, true),
    p_parent_id
  )
  returning id into resolved_category_id;

  return resolved_category_id;
end;
$$;

grant execute on function public.admin_create_category(text, text, text, text, text, integer, boolean, uuid) to authenticated;

create or replace function public.admin_update_category(
  p_category_id uuid,
  p_name text,
  p_name_ar text default null,
  p_slug text default null,
  p_icon text default null,
  p_image_url text default null,
  p_sort_order integer default 0,
  p_is_active boolean default true,
  p_parent_id uuid default null
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

  if p_parent_id = p_category_id then
    raise exception 'A category cannot be its own parent.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'Category name is required.';
  end if;

  update public.categories
  set
    name = trim(p_name),
    name_ar = nullif(trim(coalesce(p_name_ar, '')), ''),
    slug = nullif(trim(coalesce(p_slug, '')), ''),
    icon = nullif(trim(coalesce(p_icon, '')), ''),
    image_url = nullif(trim(coalesce(p_image_url, '')), ''),
    sort_order = coalesce(p_sort_order, 0),
    is_active = coalesce(p_is_active, true),
    parent_id = p_parent_id
  where id = p_category_id
  returning id into resolved_category_id;

  if resolved_category_id is null then
    raise exception 'Category was not found.';
  end if;

  return resolved_category_id;
end;
$$;

grant execute on function public.admin_update_category(uuid, text, text, text, text, text, integer, boolean, uuid) to authenticated;
