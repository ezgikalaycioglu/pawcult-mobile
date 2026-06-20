alter table public.pet_owner_invites
drop constraint if exists pet_owner_invites_status_check;

alter table public.pet_owner_invites
add constraint pet_owner_invites_status_check check (
  status in (
    'pending',
    'accepted',
    'expired',
    'revoked',
    'declined',
    'canceled'
  )
);

create type public.pet_owner_request as (
  id uuid,
  pet_id uuid,
  pet_name text,
  inviter_display_name text,
  inviter_email text,
  invited_email text,
  token uuid,
  status text,
  created_at timestamptz,
  expires_at timestamptz
);

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

create or replace function public.get_pet_owner_requests(
  request_direction text
)
returns setof public.pet_owner_request
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select *
  from private.get_pet_owner_requests_impl(request_direction);
end;
$$;

revoke all on function public.get_pet_owner_requests(text) from public;
grant execute on function public.get_pet_owner_requests(text) to authenticated;

create or replace function private.accept_pet_owner_request_impl(
  target_invite_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invite_row public.pet_owner_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into invite_row
  from public.pet_owner_invites
  where id = target_invite_id
  limit 1;

  if invite_row.id is null
    or invite_row.status <> 'pending'
    or invite_row.expires_at <= now()
    or lower(invite_row.invited_email) <> current_user_email then
    raise exception 'invite_not_found';
  end if;

  return private.accept_pet_owner_invite_impl(invite_row.token);
end;
$$;

create or replace function public.accept_pet_owner_request(
  invite_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.accept_pet_owner_request_impl(invite_id);
end;
$$;

revoke all on function public.accept_pet_owner_request(uuid) from public;
grant execute on function public.accept_pet_owner_request(uuid) to authenticated;

create or replace function private.decline_pet_owner_request_impl(
  target_invite_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  declined_pet_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.pet_owner_invites
  set status = 'declined'
  where id = target_invite_id
    and status = 'pending'
    and expires_at > now()
    and lower(invited_email) = current_user_email
  returning pet_id
  into declined_pet_id;

  if declined_pet_id is null then
    raise exception 'invite_not_found';
  end if;

  return declined_pet_id;
end;
$$;

create or replace function public.decline_pet_owner_request(
  invite_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.decline_pet_owner_request_impl(invite_id);
end;
$$;

revoke all on function public.decline_pet_owner_request(uuid) from public;
grant execute on function public.decline_pet_owner_request(uuid) to authenticated;

create or replace function private.cancel_pet_owner_invite_impl(
  target_invite_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  canceled_pet_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.pet_owner_invites
  set status = 'canceled'
  where id = target_invite_id
    and status = 'pending'
    and expires_at > now()
    and private.user_owns_pet(pet_id, current_user_id)
  returning pet_id
  into canceled_pet_id;

  if canceled_pet_id is null then
    raise exception 'invite_not_found';
  end if;

  return canceled_pet_id;
end;
$$;

create or replace function public.cancel_pet_owner_invite(
  invite_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.cancel_pet_owner_invite_impl(invite_id);
end;
$$;

revoke all on function public.cancel_pet_owner_invite(uuid) from public;
grant execute on function public.cancel_pet_owner_invite(uuid) to authenticated;
