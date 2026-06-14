create type public.pet_owner_invite_created as (
  id uuid,
  token uuid,
  invited_email text,
  expires_at timestamptz
);

create type public.pet_owner_invite_preview as (
  pet_name text,
  inviter_display_name text,
  invited_email text,
  expires_at timestamptz,
  status text
);

create or replace function private.create_pet_owner_invite_impl(
  target_pet_id uuid,
  target_invited_email text
)
returns public.pet_owner_invite_created
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(target_invited_email));
  invite_row public.pet_owner_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if normalized_email is null or normalized_email = '' then
    raise exception 'invalid_email';
  end if;

  if not private.user_owns_pet(target_pet_id, current_user_id) then
    raise exception 'not_pet_owner';
  end if;

  update public.pet_owner_invites
  set status = 'expired'
  where pet_id = target_pet_id
    and lower(invited_email) = normalized_email
    and status = 'pending'
    and expires_at <= now();

  select *
  into invite_row
  from public.pet_owner_invites
  where pet_id = target_pet_id
    and lower(invited_email) = normalized_email
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invite_row.id is null then
    insert into public.pet_owner_invites (
      pet_id,
      invited_email,
      invited_by_user_id
    )
    values (
      target_pet_id,
      normalized_email,
      current_user_id
    )
    returning *
    into invite_row;
  end if;

  return (
    invite_row.id,
    invite_row.token,
    invite_row.invited_email,
    invite_row.expires_at
  )::public.pet_owner_invite_created;
end;
$$;

create or replace function public.create_pet_owner_invite(
  pet_id uuid,
  invited_email text
)
returns public.pet_owner_invite_created
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.create_pet_owner_invite_impl(pet_id, invited_email);
end;
$$;

revoke all on function public.create_pet_owner_invite(uuid, text) from public;
grant execute on function public.create_pet_owner_invite(uuid, text) to authenticated;

drop trigger if exists pet_owner_invites_accept_before_update
on public.pet_owner_invites;

create trigger pet_owner_invites_accept_before_update
before update on public.pet_owner_invites
for each row
when (old.status = 'pending' and new.status = 'accepted')
execute function private.accept_pet_owner_invite();

create or replace function private.get_pet_owner_invite_preview_impl(
  invite_token uuid
)
returns public.pet_owner_invite_preview
language plpgsql
security definer
set search_path = ''
as $$
declare
  preview public.pet_owner_invite_preview;
begin
  select
    pet_profiles.name,
    coalesce(
      auth_users.raw_user_meta_data ->> 'display_name',
      auth_users.raw_user_meta_data ->> 'name',
      auth_users.email,
      'Another owner'
    ),
    pet_owner_invites.invited_email,
    pet_owner_invites.expires_at,
    pet_owner_invites.status
  into preview
  from public.pet_owner_invites
  join public.pet_profiles
    on pet_profiles.id = pet_owner_invites.pet_id
  left join auth.users as auth_users
    on auth_users.id = pet_owner_invites.invited_by_user_id
  where pet_owner_invites.token = invite_token
    and pet_owner_invites.status in ('pending', 'accepted')
    and (
      pet_owner_invites.status = 'accepted'
      or pet_owner_invites.expires_at > now()
    );

  if preview.pet_name is null then
    raise exception 'invite_not_found';
  end if;

  return preview;
end;
$$;

create or replace function public.get_pet_owner_invite_preview(
  invite_token uuid
)
returns public.pet_owner_invite_preview
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.get_pet_owner_invite_preview_impl(invite_token);
end;
$$;

revoke all on function public.get_pet_owner_invite_preview(uuid) from public;
grant execute on function public.get_pet_owner_invite_preview(uuid) to anon, authenticated;

create or replace function private.accept_pet_owner_invite_impl(
  invite_token uuid
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
  where token = invite_token
  limit 1;

  if invite_row.id is null then
    raise exception 'invite_not_found';
  end if;

  if invite_row.status = 'accepted' then
    raise exception 'already_accepted';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'invite_not_found';
  end if;

  if invite_row.expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  if lower(invite_row.invited_email) <> current_user_email then
    raise exception 'email_mismatch';
  end if;

  insert into public.pet_owners (
    pet_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    accepted_at
  )
  values (
    invite_row.pet_id,
    current_user_id,
    'owner',
    'active',
    invite_row.invited_by_user_id,
    now()
  )
  on conflict (pet_id, user_id)
  do update set
    role = 'owner',
    status = 'active',
    invited_by_user_id = excluded.invited_by_user_id,
    accepted_at = excluded.accepted_at;

  update public.pet_owner_invites
  set
    status = 'accepted',
    accepted_at = now()
  where id = invite_row.id;

  return invite_row.pet_id;
end;
$$;

create or replace function public.accept_pet_owner_invite(
  invite_token uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.accept_pet_owner_invite_impl(invite_token);
end;
$$;

revoke all on function public.accept_pet_owner_invite(uuid) from public;
grant execute on function public.accept_pet_owner_invite(uuid) to authenticated;
