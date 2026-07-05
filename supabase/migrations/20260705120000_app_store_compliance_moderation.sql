create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function private.is_app_admin(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = target_user_id
  );
$$;

revoke all on function private.is_app_admin(uuid) from public;
grant execute on function private.is_app_admin(uuid) to authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select private.is_app_admin(auth.uid());
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

create policy "Admins can view app admins"
on public.app_admins
for select
to authenticated
using (private.is_app_admin(auth.uid()));

insert into public.app_admins (user_id)
select id
from auth.users
where lower(email) = 'info.pawcult@gmail.com'
on conflict (user_id) do nothing;

create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocker_user_id <> blocked_user_id),
  constraint user_blocks_unique unique (blocker_user_id, blocked_user_id)
);

create index idx_user_blocks_blocker_user_id
on public.user_blocks(blocker_user_id);

create index idx_user_blocks_blocked_user_id
on public.user_blocks(blocked_user_id);

alter table public.user_blocks enable row level security;

create policy "Users can view their own blocks"
on public.user_blocks
for select
to authenticated
using (blocker_user_id = auth.uid());

create policy "Users can create their own blocks"
on public.user_blocks
for insert
to authenticated
with check (
  blocker_user_id = auth.uid()
  and blocked_user_id <> auth.uid()
);

create policy "Users can delete their own blocks"
on public.user_blocks
for delete
to authenticated
using (blocker_user_id = auth.uid());

create or replace function private.users_are_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_blocks
    where (
      blocker_user_id = user_a
      and blocked_user_id = user_b
    ) or (
      blocker_user_id = user_b
      and blocked_user_id = user_a
    )
  );
$$;

revoke all on function private.users_are_blocked(uuid, uuid) from public;
grant execute on function private.users_are_blocked(uuid, uuid) to authenticated;

create type public.user_report_summary as (
  id uuid,
  reporter_user_id uuid,
  reporter_email text,
  reported_user_id uuid,
  reported_email text,
  content_type text,
  content_id uuid,
  reason text,
  details text,
  status text,
  admin_note text,
  created_at timestamptz,
  reviewed_at timestamptz
);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid null references auth.users(id) on delete set null,
  content_type text not null,
  content_id uuid null,
  reason text not null,
  details text null,
  status text not null default 'open',
  admin_note text null,
  reviewed_by_user_id uuid null references auth.users(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint user_reports_content_type_check check (
    content_type in ('user', 'pet', 'dog_park', 'dog_park_checkin', 'friend_profile')
  ),
  constraint user_reports_reason_length check (char_length(reason) between 1 and 80),
  constraint user_reports_details_length check (details is null or char_length(details) <= 1000),
  constraint user_reports_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed')
  )
);

create index idx_user_reports_reporter_user_id
on public.user_reports(reporter_user_id);

create index idx_user_reports_reported_user_id
on public.user_reports(reported_user_id);

create index idx_user_reports_status_created_at
on public.user_reports(status, created_at desc);

alter table public.user_reports enable row level security;

create policy "Users can create reports"
on public.user_reports
for insert
to authenticated
with check (
  reporter_user_id = auth.uid()
  and status = 'open'
  and reviewed_by_user_id is null
  and reviewed_at is null
);

create policy "Users can view their own reports"
on public.user_reports
for select
to authenticated
using (
  reporter_user_id = auth.uid()
  or private.is_app_admin(auth.uid())
);

create policy "Admins can update reports"
on public.user_reports
for update
to authenticated
using (private.is_app_admin(auth.uid()))
with check (private.is_app_admin(auth.uid()));

create or replace function public.block_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  block_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'cannot_block_self';
  end if;

  insert into public.user_blocks (blocker_user_id, blocked_user_id)
  values (auth.uid(), target_user_id)
  on conflict (blocker_user_id, blocked_user_id)
  do update set created_at = public.user_blocks.created_at
  returning id into block_id;

  update public.user_friends
  set
    status = 'blocked',
    accepted_at = null
  where status in ('pending', 'accepted')
    and (
      (requester_user_id = auth.uid() and addressee_user_id = target_user_id)
      or (requester_user_id = target_user_id and addressee_user_id = auth.uid())
    );

  return block_id;
end;
$$;

create or replace function public.unblock_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_blocks
  where blocker_user_id = auth.uid()
    and blocked_user_id = target_user_id
  returning id into deleted_id;

  return deleted_id;
end;
$$;

create or replace function public.create_user_report(
  content_type text,
  content_id uuid,
  reported_user_id uuid,
  reason text,
  details text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  report_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_reports (
    reporter_user_id,
    reported_user_id,
    content_type,
    content_id,
    reason,
    details
  )
  values (
    auth.uid(),
    reported_user_id,
    content_type,
    content_id,
    trim(reason),
    nullif(trim(coalesce(details, '')), '')
  )
  returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.get_admin_reports(status_filter text default 'open')
returns setof public.user_report_summary
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not private.is_app_admin(auth.uid()) then
    raise exception 'not_admin';
  end if;

  return query
  select
    user_reports.id,
    user_reports.reporter_user_id,
    reporter.email::text,
    user_reports.reported_user_id,
    reported.email::text,
    user_reports.content_type,
    user_reports.content_id,
    user_reports.reason,
    user_reports.details,
    user_reports.status,
    user_reports.admin_note,
    user_reports.created_at,
    user_reports.reviewed_at
  from public.user_reports
  join auth.users as reporter
    on reporter.id = user_reports.reporter_user_id
  left join auth.users as reported
    on reported.id = user_reports.reported_user_id
  where status_filter = 'all'
    or user_reports.status = status_filter
  order by user_reports.created_at desc, user_reports.id desc;
end;
$$;

create or replace function public.update_admin_report(
  report_id uuid,
  next_status text,
  next_admin_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not private.is_app_admin(auth.uid()) then
    raise exception 'not_admin';
  end if;

  update public.user_reports
  set
    status = next_status,
    admin_note = nullif(trim(coalesce(next_admin_note, '')), ''),
    reviewed_by_user_id = auth.uid(),
    reviewed_at = now()
  where id = report_id
  returning id into updated_id;

  if updated_id is null then
    raise exception 'report_not_found';
  end if;

  return updated_id;
end;
$$;

revoke all on function public.block_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;

revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;

revoke all on function public.create_user_report(text, uuid, uuid, text, text) from public;
grant execute on function public.create_user_report(text, uuid, uuid, text, text) to authenticated;

revoke all on function public.get_admin_reports(text) from public;
grant execute on function public.get_admin_reports(text) to authenticated;

revoke all on function public.update_admin_report(uuid, text, text) from public;
grant execute on function public.update_admin_report(uuid, text, text) to authenticated;

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
    return ('no_account', null, null, null, normalized_email)::public.friend_request_result;
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

  if private.users_are_blocked(current_user_id, target_user.id) then
    return (
      'request_pending',
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

    if existing_friendship.status = 'blocked' then
      return (
        'request_pending',
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
      set status = 'accepted', accepted_at = now()
      where id = existing_friendship.id
      returning * into existing_friendship;

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
      set status = 'pending', accepted_at = null, created_at = now()
      where id = existing_friendship.id
      returning * into existing_friendship;

      return (
        'sent',
        existing_friendship.id,
        target_user.id,
        private.get_user_display_name(target_user.id),
        target_user.email::text
      )::public.friend_request_result;
    end if;
  end if;

  insert into public.user_friends (requester_user_id, addressee_user_id, status)
  values (current_user_id, target_user.id, 'pending')
  returning * into existing_friendship;

  return (
    'sent',
    existing_friendship.id,
    target_user.id,
    private.get_user_display_name(target_user.id),
    target_user.email::text
  )::public.friend_request_result;
end;
$$;

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
  where not private.users_are_blocked(current_user_id, accepted_friends.friend_user_id)
  order by private.get_user_display_name(accepted_friends.friend_user_id);
end;
$$;

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

  if private.users_are_blocked(current_user_id, friend_user_id) then
    raise exception 'not_friends';
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
    'userId', friend_user.id,
    'displayName', private.get_user_display_name(friend_user.id),
    'email', friend_user.email::text,
    'pets', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pet_profiles.id,
            'name', pet_profiles.name,
            'breed', pet_profiles.breed,
            'bio', pet_profiles.bio,
            'profilePhotoUri', pet_profiles.profile_photo_url
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
    'checkIns', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', dog_park_checkins.id,
            'dogParkId', dog_park_checkins.dog_park_id,
            'dogParkName', dog_parks.name,
            'petId', dog_park_checkins.pet_id,
            'petName', pet_profiles.name,
            'startsAt', dog_park_checkins.starts_at,
            'endsAt', dog_park_checkins.ends_at
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
    and (
      dog_park_checkins.user_id = current_user_id
      or not private.users_are_blocked(current_user_id, dog_park_checkins.user_id)
    )
  order by dog_park_checkins.starts_at;
end;
$$;
