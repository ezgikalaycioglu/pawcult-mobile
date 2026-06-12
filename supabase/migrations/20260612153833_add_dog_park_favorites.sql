create table public.dog_park_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_park_id uuid not null references public.dog_parks(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dog_park_favorites_unique unique (user_id, dog_park_id)
);

create index idx_dog_park_favorites_user_id on public.dog_park_favorites(user_id);
create index idx_dog_park_favorites_dog_park_id on public.dog_park_favorites(dog_park_id);

alter table public.dog_park_favorites enable row level security;

create policy "Users can view their own favorite dog parks"
on public.dog_park_favorites
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can save approved dog parks as favorites"
on public.dog_park_favorites
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.dog_parks
    where dog_parks.id = dog_park_favorites.dog_park_id
      and dog_parks.status = 'approved'
  )
);

create policy "Users can remove their own favorite dog parks"
on public.dog_park_favorites
for delete
to authenticated
using (user_id = auth.uid());
