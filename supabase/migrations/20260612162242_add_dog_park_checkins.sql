create table public.dog_park_checkins (
  id uuid primary key default gen_random_uuid(),
  dog_park_id uuid not null references public.dog_parks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid not null references public.pet_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  checked_out_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dog_park_checkins_time_order check (ends_at > starts_at),
  constraint dog_park_checkins_checkout_order check (
    checked_out_at is null or checked_out_at >= starts_at
  )
);

create index idx_dog_park_checkins_dog_park_id on public.dog_park_checkins(dog_park_id);
create index idx_dog_park_checkins_pet_id on public.dog_park_checkins(pet_id);
create index idx_dog_park_checkins_user_id on public.dog_park_checkins(user_id);
create index idx_dog_park_checkins_visibility
  on public.dog_park_checkins(dog_park_id, starts_at, ends_at)
  where checked_out_at is null;

create or replace function public.handle_dog_park_checkins_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dog_park_checkins_set_updated_at
before update on public.dog_park_checkins
for each row
execute function public.handle_dog_park_checkins_updated_at();

create or replace function public.prevent_dog_park_checkin_reschedule()
returns trigger
language plpgsql
as $$
begin
  if new.dog_park_id <> old.dog_park_id
    or new.user_id <> old.user_id
    or new.pet_id <> old.pet_id
    or new.starts_at <> old.starts_at
    or new.ends_at <> old.ends_at then
    raise exception 'Dog park check-ins cannot be rescheduled. Check out and create a new check-in instead.';
  end if;

  return new;
end;
$$;

create trigger dog_park_checkins_prevent_reschedule
before update on public.dog_park_checkins
for each row
execute function public.prevent_dog_park_checkin_reschedule();

alter table public.dog_park_checkins enable row level security;

create policy "Users can view visible dog park check-ins"
on public.dog_park_checkins
for select
to authenticated
using (
  checked_out_at is null
  and ends_at > now()
  and starts_at <= now() + interval '7 days'
  and exists (
    select 1
    from public.dog_parks
    where dog_parks.id = dog_park_checkins.dog_park_id
      and dog_parks.status = 'approved'
  )
);

create policy "Users can create dog park check-ins for their pets"
on public.dog_park_checkins
for insert
to authenticated
with check (
  user_id = auth.uid()
  and checked_out_at is null
  and ends_at > starts_at
  and starts_at <= now() + interval '7 days'
  and exists (
    select 1
    from public.pet_profiles
    where pet_profiles.id = dog_park_checkins.pet_id
      and pet_profiles.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.dog_parks
    where dog_parks.id = dog_park_checkins.dog_park_id
      and dog_parks.status = 'approved'
  )
);

create policy "Users can check out their own dog park check-ins"
on public.dog_park_checkins
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and checked_out_at is not null
);

create policy "Users can view pets with visible dog park check-ins"
on public.pet_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.dog_park_checkins
    join public.dog_parks
      on dog_parks.id = dog_park_checkins.dog_park_id
    where dog_park_checkins.pet_id = pet_profiles.id
      and dog_park_checkins.checked_out_at is null
      and dog_park_checkins.ends_at > now()
      and dog_park_checkins.starts_at <= now() + interval '7 days'
      and dog_parks.status = 'approved'
  )
);
