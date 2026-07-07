create or replace function private.get_pet_owner_summaries_impl(
  target_pet_id uuid
)
returns setof public.pet_owner_summary
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not private.user_owns_pet(target_pet_id, current_user_id) then
    raise exception 'not_pet_owner';
  end if;

  return query
  select
    pet_owners.id,
    pet_owners.user_id,
    coalesce(
      auth_users.raw_user_meta_data ->> 'display_name',
      auth_users.raw_user_meta_data ->> 'name',
      auth_users.email,
      'Pet parent'
    )::text as display_name,
    auth_users.email::text,
    pet_owners.role::text,
    pet_owners.status::text,
    pet_owners.accepted_at,
    pet_owners.user_id = current_user_id as is_current_user
  from public.pet_owners
  left join auth.users as auth_users
    on auth_users.id = pet_owners.user_id
  where pet_owners.pet_id = target_pet_id
    and pet_owners.status = 'active'
  order by
    pet_owners.accepted_at nulls last,
    pet_owners.created_at;
end;
$$;
