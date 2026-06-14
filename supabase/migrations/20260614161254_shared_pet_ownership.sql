alter table public.pet_profiles
add column if not exists created_by_user_id uuid references auth.users(id);

update public.pet_profiles
set created_by_user_id = user_id
where created_by_user_id is null;

comment on column public.pet_profiles.user_id is
  'Legacy owner column kept temporarily for backwards compatibility. Use pet_owners for pet access.';

comment on column public.pet_profiles.created_by_user_id is
  'User who originally created this pet profile.';

create table public.pet_owners (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  status text not null default 'active',
  invited_by_user_id uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  constraint pet_owners_unique_pet_user unique (pet_id, user_id),
  constraint pet_owners_role_check check (role in ('owner', 'caregiver')),
  constraint pet_owners_status_check check (status in ('active', 'invited', 'removed'))
);

insert into public.pet_owners (
  pet_id,
  user_id,
  role,
  status,
  invited_by_user_id,
  created_at,
  accepted_at
)
select
  id,
  user_id,
  'owner',
  'active',
  user_id,
  created_at,
  created_at
from public.pet_profiles
where user_id is not null
on conflict (pet_id, user_id) do nothing;

create index idx_pet_owners_user_id on public.pet_owners(user_id);
create index idx_pet_owners_pet_id on public.pet_owners(pet_id);
create index idx_pet_owners_pet_id_user_id on public.pet_owners(pet_id, user_id);

alter table public.pet_owners enable row level security;

create or replace function private.user_owns_pet(target_pet_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pet_owners
    where pet_id = target_pet_id
      and user_id = target_user_id
      and status = 'active'
  );
$$;

revoke all on function private.user_owns_pet(uuid, uuid) from public;
grant execute on function private.user_owns_pet(uuid, uuid) to authenticated;

create or replace function private.pet_profiles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by_user_id = coalesce(new.created_by_user_id, new.user_id);
  return new;
end;
$$;

create or replace function private.pet_profiles_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pet_owners (
    pet_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    accepted_at
  )
  values (
    new.id,
    new.created_by_user_id,
    'owner',
    'active',
    new.created_by_user_id,
    now()
  )
  on conflict (pet_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists pet_profiles_set_created_by_user_id
on public.pet_profiles;

create trigger pet_profiles_set_created_by_user_id
before insert on public.pet_profiles
for each row
execute function private.pet_profiles_before_insert();

drop trigger if exists pet_profiles_create_owner
on public.pet_profiles;

create trigger pet_profiles_create_owner
after insert on public.pet_profiles
for each row
execute function private.pet_profiles_after_insert();

drop policy if exists "Users can view their own pets"
on public.pet_profiles;

create policy "Users can view active owned pets"
on public.pet_profiles
for select
to authenticated
using (private.user_owns_pet(id, auth.uid()));

drop policy if exists "Users can create their own pets"
on public.pet_profiles;

create policy "Users can create their own pets"
on public.pet_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and coalesce(created_by_user_id, auth.uid()) = auth.uid()
);

drop policy if exists "Users can update their own pets"
on public.pet_profiles;

create policy "Users can update active owned pets"
on public.pet_profiles
for update
to authenticated
using (private.user_owns_pet(id, auth.uid()))
with check (private.user_owns_pet(id, auth.uid()));

drop policy if exists "Users can delete their own pets"
on public.pet_profiles;

create policy "Users can delete active owned pets"
on public.pet_profiles
for delete
to authenticated
using (private.user_owns_pet(id, auth.uid()));

drop policy if exists "Users can create dog park check-ins for their pets"
on public.dog_park_checkins;

create policy "Users can create dog park check-ins for active owned pets"
on public.dog_park_checkins
for insert
to authenticated
with check (
  user_id = auth.uid()
  and checked_out_at is null
  and ends_at > starts_at
  and starts_at <= now() + interval '7 days'
  and private.user_owns_pet(pet_id, auth.uid())
  and exists (
    select 1
    from public.dog_parks
    where dog_parks.id = dog_park_checkins.dog_park_id
      and dog_parks.status = 'approved'
  )
);

create policy "Active owners can view pet owner memberships"
on public.pet_owners
for select
to authenticated
using (private.user_owns_pet(pet_id, auth.uid()));

create table public.pet_owner_invites (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  invited_email text not null,
  invited_by_user_id uuid not null references auth.users(id),
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now(),
  accepted_at timestamptz null,
  constraint pet_owner_invites_status_check check (
    status in ('pending', 'accepted', 'expired', 'revoked')
  )
);

create unique index pet_owner_invites_unique_pending_email
on public.pet_owner_invites(pet_id, invited_email, status)
where status = 'pending';

create index idx_pet_owner_invites_pet_id
on public.pet_owner_invites(pet_id);

create index idx_pet_owner_invites_invited_email
on public.pet_owner_invites(lower(invited_email));

create index idx_pet_owner_invites_token
on public.pet_owner_invites(token);

alter table public.pet_owner_invites enable row level security;

create policy "Active owners can create pet owner invites"
on public.pet_owner_invites
for insert
to authenticated
with check (
  invited_by_user_id = auth.uid()
  and status = 'pending'
  and private.user_owns_pet(pet_id, auth.uid())
);

create policy "Active owners can view pet owner invites"
on public.pet_owner_invites
for select
to authenticated
using (private.user_owns_pet(pet_id, auth.uid()));

create policy "Invited users can view their pending pet owner invites"
on public.pet_owner_invites
for select
to authenticated
using (
  status = 'pending'
  and expires_at > now()
  and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy "Invited users can accept pet owner invites"
on public.pet_owner_invites
for update
to authenticated
using (
  status = 'pending'
  and expires_at > now()
  and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  status = 'accepted'
  and lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create or replace function private.accept_pet_owner_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'pending' or new.status <> 'accepted' then
    raise exception 'Only pending pet owner invites can be accepted.';
  end if;

  if new.pet_id <> old.pet_id
    or new.invited_email <> old.invited_email
    or new.invited_by_user_id <> old.invited_by_user_id
    or new.token <> old.token
    or new.expires_at <> old.expires_at
    or new.created_at <> old.created_at then
    raise exception 'Pet owner invite details cannot be changed during acceptance.';
  end if;

  if old.expires_at <= now() then
    raise exception 'Pet owner invite has expired.';
  end if;

  if lower(old.invited_email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'Pet owner invite email does not match the current user.';
  end if;

  new.accepted_at = coalesce(new.accepted_at, now());
  return new;
end;
$$;

create or replace function private.create_pet_owner_from_accepted_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.pet_owners (
    pet_id,
    user_id,
    role,
    status,
    invited_by_user_id,
    accepted_at
  )
  values (
    new.pet_id,
    auth.uid(),
    'owner',
    'active',
    new.invited_by_user_id,
    coalesce(new.accepted_at, now())
  )
  on conflict (pet_id, user_id)
  do update set
    role = 'owner',
    status = 'active',
    invited_by_user_id = excluded.invited_by_user_id,
    accepted_at = excluded.accepted_at;

  return new;
end;
$$;

create trigger pet_owner_invites_accept_before_update
before update on public.pet_owner_invites
for each row
when (old.status is distinct from new.status)
execute function private.accept_pet_owner_invite();

create trigger pet_owner_invites_create_owner_after_update
after update on public.pet_owner_invites
for each row
when (old.status = 'pending' and new.status = 'accepted')
execute function private.create_pet_owner_from_accepted_invite();

create table public.dog_park_checkin_attendees (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.dog_park_checkins(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'attending',
  created_at timestamptz not null default now(),
  constraint dog_park_checkin_attendees_unique unique (checkin_id, user_id)
);

create index idx_dog_park_checkin_attendees_checkin_id
on public.dog_park_checkin_attendees(checkin_id);

create index idx_dog_park_checkin_attendees_user_id
on public.dog_park_checkin_attendees(user_id);

alter table public.dog_park_checkin_attendees enable row level security;

create or replace function private.create_dog_park_checkin_creator_attendee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.dog_park_checkin_attendees (
    checkin_id,
    user_id,
    role
  )
  values (
    new.id,
    new.user_id,
    'attending'
  )
  on conflict (checkin_id, user_id) do nothing;

  return new;
end;
$$;

create trigger dog_park_checkins_create_creator_attendee
after insert on public.dog_park_checkins
for each row
execute function private.create_dog_park_checkin_creator_attendee();

create policy "Authenticated users can view visible check-in attendees"
on public.dog_park_checkin_attendees
for select
to authenticated
using (
  exists (
    select 1
    from public.dog_park_checkins
    join public.dog_parks
      on dog_parks.id = dog_park_checkins.dog_park_id
    where dog_park_checkins.id = dog_park_checkin_attendees.checkin_id
      and dog_park_checkins.checked_out_at is null
      and dog_park_checkins.ends_at > now()
      and dog_park_checkins.starts_at <= now() + interval '7 days'
      and dog_parks.status = 'approved'
  )
);
