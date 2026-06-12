create schema if not exists private;

create or replace function private.user_owns_pet(target_pet_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pet_profiles
    where id = target_pet_id
      and user_id = target_user_id
  );
$$;

create or replace function private.pet_has_visible_dog_park_checkin(target_pet_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.dog_park_checkins
    join public.dog_parks
      on dog_parks.id = dog_park_checkins.dog_park_id
    where dog_park_checkins.pet_id = target_pet_id
      and dog_park_checkins.checked_out_at is null
      and dog_park_checkins.ends_at > now()
      and dog_park_checkins.starts_at <= now() + interval '7 days'
      and dog_parks.status = 'approved'
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;

revoke all on function private.user_owns_pet(uuid, uuid) from public;
grant execute on function private.user_owns_pet(uuid, uuid) to authenticated;

revoke all on function private.pet_has_visible_dog_park_checkin(uuid) from public;
grant execute on function private.pet_has_visible_dog_park_checkin(uuid) to authenticated;

drop policy if exists "Users can create dog park check-ins for their pets"
on public.dog_park_checkins;

create policy "Users can create dog park check-ins for their pets"
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

drop policy if exists "Users can view pets with visible dog park check-ins"
on public.pet_profiles;

create policy "Users can view pets with visible dog park check-ins"
on public.pet_profiles
for select
to authenticated
using (private.pet_has_visible_dog_park_checkin(id));
