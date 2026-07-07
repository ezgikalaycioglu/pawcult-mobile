do $$
begin
  if not exists (
    select 1
    from pg_type
    join pg_namespace
      on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'pet_owner_invite_result'
  ) then
    create type public.pet_owner_invite_result as (
      status text,
      invite_id uuid,
      invited_user_id uuid,
      invited_display_name text,
      invited_email text,
      token uuid,
      expires_at timestamptz
    );
  end if;
end
$$;

drop function if exists public.create_pet_owner_invite(uuid, text);
drop function if exists private.create_pet_owner_invite_impl(uuid, text);

create or replace function private.create_pet_owner_invite_impl(
  target_pet_id uuid,
  target_invited_email text
)
returns public.pet_owner_invite_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(target_invited_email));
  target_user auth.users%rowtype;
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

  select *
  into target_user
  from auth.users
  where lower(email) = normalized_email
  limit 1;

  if target_user.id is null then
    return (
      'no_account',
      null,
      null,
      null,
      normalized_email,
      null,
      null
    )::public.pet_owner_invite_result;
  end if;

  if target_user.id = current_user_id then
    return (
      'self',
      null,
      target_user.id,
      private.get_user_display_name(target_user.id),
      target_user.email::text,
      null,
      null
    )::public.pet_owner_invite_result;
  end if;

  if private.user_owns_pet(target_pet_id, target_user.id) then
    return (
      'already_owner',
      null,
      target_user.id,
      private.get_user_display_name(target_user.id),
      target_user.email::text,
      null,
      null
    )::public.pet_owner_invite_result;
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

  if invite_row.id is not null then
    return (
      'request_pending',
      invite_row.id,
      target_user.id,
      private.get_user_display_name(target_user.id),
      target_user.email::text,
      invite_row.token,
      invite_row.expires_at
    )::public.pet_owner_invite_result;
  end if;

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

  return (
    'sent',
    invite_row.id,
    target_user.id,
    private.get_user_display_name(target_user.id),
    invite_row.invited_email,
    invite_row.token,
    invite_row.expires_at
  )::public.pet_owner_invite_result;
end;
$$;

create or replace function public.create_pet_owner_invite(
  pet_id uuid,
  invited_email text
)
returns public.pet_owner_invite_result
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
