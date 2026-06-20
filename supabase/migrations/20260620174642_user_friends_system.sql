create table public.user_friends (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  addressee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  constraint user_friends_unique_requester_addressee unique (
    requester_user_id,
    addressee_user_id
  ),
  constraint user_friends_not_self check (requester_user_id <> addressee_user_id),
  constraint user_friends_status_check check (
    status in ('pending', 'accepted', 'declined', 'cancelled', 'blocked')
  )
);

create index idx_user_friends_requester_user_id
on public.user_friends(requester_user_id);

create index idx_user_friends_addressee_user_id
on public.user_friends(addressee_user_id);

create index idx_user_friends_status
on public.user_friends(status);

alter table public.user_friends enable row level security;

revoke update on public.user_friends from authenticated;
grant update(status, accepted_at) on public.user_friends to authenticated;

create policy "Users can view their friendships"
on public.user_friends
for select
to authenticated
using (
  requester_user_id = auth.uid()
  or addressee_user_id = auth.uid()
);

create policy "Users can create outgoing friend requests"
on public.user_friends
for insert
to authenticated
with check (
  requester_user_id = auth.uid()
  and requester_user_id <> addressee_user_id
  and status = 'pending'
  and accepted_at is null
);

create policy "Addressees can accept or decline pending requests"
on public.user_friends
for update
to authenticated
using (
  addressee_user_id = auth.uid()
  and status = 'pending'
)
with check (
  addressee_user_id = auth.uid()
  and status in ('accepted', 'declined')
);

create policy "Requesters can cancel pending requests"
on public.user_friends
for update
to authenticated
using (
  requester_user_id = auth.uid()
  and status = 'pending'
)
with check (
  requester_user_id = auth.uid()
  and status = 'cancelled'
);

create or replace function private.users_are_friends(
  user_a uuid,
  user_b uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_friends
    where status = 'accepted'
      and (
        (
          requester_user_id = user_a
          and addressee_user_id = user_b
        )
        or (
          requester_user_id = user_b
          and addressee_user_id = user_a
        )
      )
  );
$$;

revoke all on function private.users_are_friends(uuid, uuid) from public;
grant execute on function private.users_are_friends(uuid, uuid) to authenticated;

create or replace function private.get_user_display_name(target_user_id uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    auth_users.raw_user_meta_data ->> 'display_name',
    auth_users.raw_user_meta_data ->> 'name',
    auth_users.email::text,
    'PawCult user'
  )
  from auth.users as auth_users
  where auth_users.id = target_user_id;
$$;

revoke all on function private.get_user_display_name(uuid) from public;
grant execute on function private.get_user_display_name(uuid) to authenticated;

create type public.friend_request_result as (
  status text,
  friendship_id uuid,
  friend_user_id uuid,
  friend_display_name text,
  friend_email text
);

create type public.friend_request_summary as (
  id uuid,
  requester_user_id uuid,
  requester_display_name text,
  requester_email text,
  addressee_user_id uuid,
  addressee_display_name text,
  addressee_email text,
  status text,
  created_at timestamptz,
  accepted_at timestamptz
);

create type public.friend_summary as (
  friendship_id uuid,
  friend_user_id uuid,
  display_name text,
  email text,
  accepted_at timestamptz,
  pet_count bigint,
  active_checkin_count bigint
);

create type public.visible_dog_park_checkin as (
  id uuid,
  dog_park_id uuid,
  user_id uuid,
  user_display_name text,
  user_email text,
  pet_id uuid,
  pet_name text,
  pet_breed text,
  pet_bio text,
  pet_profile_photo_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  checked_out_at timestamptz,
  created_at timestamptz,
  is_current_user boolean,
  is_friend boolean,
  is_shared_pet_owner boolean
);

create or replace function private.send_friend_request_by_email_impl(
  target_email text
)
returns public.friend_request_result
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_email text := lower(trim(target_email));
  target_user auth.users%rowtype;
  existing_friendship public.user_friends%rowtype;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if normalized_email is null or normalized_email = '' then
    raise exception 'invalid_email';
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
      normalized_email
    )::public.friend_request_result;
  end if;

  if target_user.id = current_user_id then
    return (
      'self',
      null,
      target_user.id,
      private.get_user_display_name(target_user.id),
      target_user.email::text
    )::public.friend_request_result;
  end if;

  select *
  into existing_friendship
  from public.user_friends
  where (
      requester_user_id = current_user_id
      and addressee_user_id = target_user.id
    )
    or (
      requester_user_id = target_user.id
      and addressee_user_id = current_user_id
    )
  order by created_at desc
  limit 1;

  if existing_friendship.id is not null then
    if existing_friendship.status = 'accepted' then
      return (
        'already_friends',
        existing_friendship.id,
        target_user.id,
        private.get_user_display_name(target_user.id),
        target_user.email::text
      )::public.friend_request_result;
    end if;

    if existing_friendship.status = 'pending'
      and existing_friendship.requester_user_id = current_user_id then
      return (
        'request_pending',
        existing_friendship.id,
        target_user.id,
        private.get_user_display_name(target_user.id),
        target_user.email::text
      )::public.friend_request_result;
    end if;

    if existing_friendship.status = 'pending'
      and existing_friendship.addressee_user_id = current_user_id then
      update public.user_friends
      set
        status = 'accepted',
        accepted_at = now()
      where id = existing_friendship.id
      returning *
      into existing_friendship;

      return (
        'accepted',
        existing_friendship.id,
        target_user.id,
        private.get_user_display_name(target_user.id),
        target_user.email::text
      )::public.friend_request_result;
    end if;

    if existing_friendship.requester_user_id = current_user_id then
      update public.user_friends
      set
        status = 'pending',
        accepted_at = null,
        created_at = now()
      where id = existing_friendship.id
      returning *
      into existing_friendship;

      return (
        'sent',
        existing_friendship.id,
        target_user.id,
        private.get_user_display_name(target_user.id),
        target_user.email::text
      )::public.friend_request_result;
    end if;
  end if;

  insert into public.user_friends (
    requester_user_id,
    addressee_user_id,
    status
  )
  values (
    current_user_id,
    target_user.id,
    'pending'
  )
  returning *
  into existing_friendship;

  return (
    'sent',
    existing_friendship.id,
    target_user.id,
    private.get_user_display_name(target_user.id),
    target_user.email::text
  )::public.friend_request_result;
end;
$$;

create or replace function public.send_friend_request_by_email(email text)
returns public.friend_request_result
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.send_friend_request_by_email_impl(email);
end;
$$;

revoke all on function public.send_friend_request_by_email(text) from public;
grant execute on function public.send_friend_request_by_email(text) to authenticated;

create or replace function private.respond_friend_request_impl(
  target_friendship_id uuid,
  response text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  next_status text;
  updated_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if response = 'accept' then
    next_status = 'accepted';
  elsif response = 'decline' then
    next_status = 'declined';
  else
    raise exception 'invalid_response';
  end if;

  update public.user_friends
  set
    status = next_status,
    accepted_at = case when next_status = 'accepted' then now() else null end
  where id = target_friendship_id
    and addressee_user_id = current_user_id
    and status = 'pending'
  returning id
  into updated_id;

  if updated_id is null then
    raise exception 'friend_request_not_found';
  end if;

  return updated_id;
end;
$$;

create or replace function public.respond_friend_request(
  friendship_id uuid,
  response text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.respond_friend_request_impl(friendship_id, response);
end;
$$;

revoke all on function public.respond_friend_request(uuid, text) from public;
grant execute on function public.respond_friend_request(uuid, text) to authenticated;

create or replace function private.cancel_friend_request_impl(
  target_friendship_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  updated_id uuid;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  update public.user_friends
  set
    status = 'cancelled',
    accepted_at = null
  where id = target_friendship_id
    and requester_user_id = current_user_id
    and status = 'pending'
  returning id
  into updated_id;

  if updated_id is null then
    raise exception 'friend_request_not_found';
  end if;

  return updated_id;
end;
$$;

create or replace function public.cancel_friend_request(friendship_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.cancel_friend_request_impl(friendship_id);
end;
$$;

revoke all on function public.cancel_friend_request(uuid) from public;
grant execute on function public.cancel_friend_request(uuid) to authenticated;

create or replace function private.get_friend_requests_impl(
  request_direction text
)
returns setof public.friend_request_summary
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if request_direction not in ('incoming', 'sent') then
    raise exception 'invalid_request_direction';
  end if;

  return query
  select
    user_friends.id,
    user_friends.requester_user_id,
    private.get_user_display_name(user_friends.requester_user_id),
    requester.email::text,
    user_friends.addressee_user_id,
    private.get_user_display_name(user_friends.addressee_user_id),
    addressee.email::text,
    user_friends.status::text,
    user_friends.created_at,
    user_friends.accepted_at
  from public.user_friends
  join auth.users as requester
    on requester.id = user_friends.requester_user_id
  join auth.users as addressee
    on addressee.id = user_friends.addressee_user_id
  where user_friends.status = 'pending'
    and (
      (
        request_direction = 'incoming'
        and user_friends.addressee_user_id = current_user_id
      )
      or (
        request_direction = 'sent'
        and user_friends.requester_user_id = current_user_id
      )
    )
  order by user_friends.created_at desc, user_friends.id desc;
end;
$$;

create or replace function public.get_friend_requests(direction text)
returns setof public.friend_request_summary
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select *
  from private.get_friend_requests_impl(direction);
end;
$$;

revoke all on function public.get_friend_requests(text) from public;
grant execute on function public.get_friend_requests(text) to authenticated;

create or replace function private.get_my_friends_impl()
returns setof public.friend_summary
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
  with accepted_friends as (
    select
      user_friends.id as friendship_id,
      case
        when user_friends.requester_user_id = current_user_id
          then user_friends.addressee_user_id
        else user_friends.requester_user_id
      end as friend_user_id,
      user_friends.accepted_at
    from public.user_friends
    where user_friends.status = 'accepted'
      and (
        user_friends.requester_user_id = current_user_id
        or user_friends.addressee_user_id = current_user_id
      )
  )
  select
    accepted_friends.friendship_id,
    accepted_friends.friend_user_id,
    private.get_user_display_name(accepted_friends.friend_user_id),
    friend_users.email::text,
    accepted_friends.accepted_at,
    (
      select count(distinct pet_owners.pet_id)
      from public.pet_owners
      where pet_owners.user_id = accepted_friends.friend_user_id
        and pet_owners.status = 'active'
    ) as pet_count,
    (
      select count(*)
      from public.dog_park_checkins
      join public.dog_parks
        on dog_parks.id = dog_park_checkins.dog_park_id
      where dog_park_checkins.user_id = accepted_friends.friend_user_id
        and dog_park_checkins.checked_out_at is null
        and dog_park_checkins.ends_at > now()
        and dog_park_checkins.starts_at <= now() + interval '7 days'
        and dog_parks.status = 'approved'
    ) as active_checkin_count
  from accepted_friends
  join auth.users as friend_users
    on friend_users.id = accepted_friends.friend_user_id
  order by private.get_user_display_name(accepted_friends.friend_user_id);
end;
$$;

create or replace function public.get_my_friends()
returns setof public.friend_summary
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select *
  from private.get_my_friends_impl();
end;
$$;

revoke all on function public.get_my_friends() from public;
grant execute on function public.get_my_friends() to authenticated;

create or replace function private.get_friend_profile_impl(
  friend_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  current_user_id uuid := auth.uid();
  friend_user auth.users%rowtype;
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if not private.users_are_friends(current_user_id, friend_user_id) then
    raise exception 'not_friends';
  end if;

  select *
  into friend_user
  from auth.users
  where id = friend_user_id;

  if friend_user.id is null then
    raise exception 'friend_not_found';
  end if;

  return jsonb_build_object(
    'userId',
    friend_user.id,
    'displayName',
    private.get_user_display_name(friend_user.id),
    'email',
    friend_user.email::text,
    'pets',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            pet_profiles.id,
            'name',
            pet_profiles.name,
            'breed',
            pet_profiles.breed,
            'bio',
            pet_profiles.bio,
            'profilePhotoUri',
            pet_profiles.profile_photo_url
          )
          order by pet_profiles.name
        )
        from public.pet_owners
        join public.pet_profiles
          on pet_profiles.id = pet_owners.pet_id
        where pet_owners.user_id = friend_user_id
          and pet_owners.status = 'active'
      ),
      '[]'::jsonb
    ),
    'checkIns',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            dog_park_checkins.id,
            'dogParkId',
            dog_park_checkins.dog_park_id,
            'dogParkName',
            dog_parks.name,
            'petId',
            dog_park_checkins.pet_id,
            'petName',
            pet_profiles.name,
            'startsAt',
            dog_park_checkins.starts_at,
            'endsAt',
            dog_park_checkins.ends_at
          )
          order by dog_park_checkins.starts_at
        )
        from public.dog_park_checkins
        join public.dog_parks
          on dog_parks.id = dog_park_checkins.dog_park_id
        join public.pet_profiles
          on pet_profiles.id = dog_park_checkins.pet_id
        where dog_park_checkins.user_id = friend_user_id
          and dog_park_checkins.checked_out_at is null
          and dog_park_checkins.ends_at > now()
          and dog_park_checkins.starts_at <= now() + interval '7 days'
          and dog_parks.status = 'approved'
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.get_friend_profile(friend_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return private.get_friend_profile_impl(friend_user_id);
end;
$$;

revoke all on function public.get_friend_profile(uuid) from public;
grant execute on function public.get_friend_profile(uuid) to authenticated;

create or replace function private.get_visible_dog_park_checkins_impl()
returns setof public.visible_dog_park_checkin
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select
    dog_park_checkins.id,
    dog_park_checkins.dog_park_id,
    dog_park_checkins.user_id,
    case
      when dog_park_checkins.user_id = current_user_id
        or private.users_are_friends(current_user_id, dog_park_checkins.user_id)
        or private.user_owns_pet(dog_park_checkins.pet_id, current_user_id)
        then private.get_user_display_name(dog_park_checkins.user_id)
      else null
    end as user_display_name,
    case
      when dog_park_checkins.user_id = current_user_id
        or private.users_are_friends(current_user_id, dog_park_checkins.user_id)
        or private.user_owns_pet(dog_park_checkins.pet_id, current_user_id)
        then auth_users.email::text
      else null
    end as user_email,
    dog_park_checkins.pet_id,
    pet_profiles.name::text,
    pet_profiles.breed::text,
    pet_profiles.bio::text,
    pet_profiles.profile_photo_url::text,
    dog_park_checkins.starts_at,
    dog_park_checkins.ends_at,
    dog_park_checkins.checked_out_at,
    dog_park_checkins.created_at,
    dog_park_checkins.user_id = current_user_id,
    private.users_are_friends(current_user_id, dog_park_checkins.user_id),
    private.user_owns_pet(dog_park_checkins.pet_id, current_user_id)
      and dog_park_checkins.user_id <> current_user_id
  from public.dog_park_checkins
  join public.dog_parks
    on dog_parks.id = dog_park_checkins.dog_park_id
  join public.pet_profiles
    on pet_profiles.id = dog_park_checkins.pet_id
  join auth.users as auth_users
    on auth_users.id = dog_park_checkins.user_id
  where dog_park_checkins.checked_out_at is null
    and dog_park_checkins.ends_at > now()
    and dog_park_checkins.starts_at <= now() + interval '7 days'
    and dog_parks.status = 'approved'
  order by dog_park_checkins.starts_at;
end;
$$;

create or replace function public.get_visible_dog_park_checkins()
returns setof public.visible_dog_park_checkin
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  select *
  from private.get_visible_dog_park_checkins_impl();
end;
$$;

revoke all on function public.get_visible_dog_park_checkins() from public;
grant execute on function public.get_visible_dog_park_checkins() to authenticated;
