create or replace function private.get_pet_owner_requests_impl(
  request_direction text
)
returns setof public.pet_owner_request
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if request_direction not in ('incoming', 'sent') then
    raise exception 'invalid_request_direction';
  end if;

  if request_direction = 'incoming' then
    return query
    select
      pet_owner_invites.id,
      pet_owner_invites.pet_id,
      pet_profiles.name::text,
      coalesce(
        inviter.raw_user_meta_data ->> 'display_name',
        inviter.raw_user_meta_data ->> 'name',
        inviter.email::text,
        'Another owner'
      )::text as inviter_display_name,
      inviter.email::text as inviter_email,
      pet_owner_invites.invited_email::text,
      pet_owner_invites.token,
      (
        case
          when pet_owner_invites.status = 'pending'
            and pet_owner_invites.expires_at <= now()
            then 'expired'
          else pet_owner_invites.status
        end
      )::text as status,
      pet_owner_invites.created_at,
      pet_owner_invites.expires_at
    from public.pet_owner_invites
    join public.pet_profiles
      on pet_profiles.id = pet_owner_invites.pet_id
    left join auth.users as inviter
      on inviter.id = pet_owner_invites.invited_by_user_id
    where lower(pet_owner_invites.invited_email) = current_user_email
    order by
      pet_owner_invites.created_at desc,
      pet_owner_invites.id desc;

    return;
  end if;

  return query
  select
    pet_owner_invites.id,
    pet_owner_invites.pet_id,
    pet_profiles.name::text,
    coalesce(
      inviter.raw_user_meta_data ->> 'display_name',
      inviter.raw_user_meta_data ->> 'name',
      inviter.email::text,
      'Another owner'
    )::text as inviter_display_name,
    inviter.email::text as inviter_email,
    pet_owner_invites.invited_email::text,
    pet_owner_invites.token,
    (
      case
        when pet_owner_invites.status = 'pending'
          and pet_owner_invites.expires_at <= now()
          then 'expired'
        else pet_owner_invites.status
      end
    )::text as status,
    pet_owner_invites.created_at,
    pet_owner_invites.expires_at
  from public.pet_owner_invites
  join public.pet_profiles
    on pet_profiles.id = pet_owner_invites.pet_id
  left join auth.users as inviter
    on inviter.id = pet_owner_invites.invited_by_user_id
  where private.user_owns_pet(pet_owner_invites.pet_id, current_user_id)
  order by
    pet_owner_invites.created_at desc,
    pet_owner_invites.id desc;
end;
$$;
