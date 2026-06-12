create table public.dog_parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  status text not null default 'pending',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dog_parks_name_length check (char_length(name) between 1 and 100),
  constraint dog_parks_latitude_range check (latitude between -90 and 90),
  constraint dog_parks_longitude_range check (longitude between -180 and 180),
  constraint dog_parks_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index idx_dog_parks_status on public.dog_parks(status);
create index idx_dog_parks_created_by on public.dog_parks(created_by);
create index idx_dog_parks_coordinates on public.dog_parks(latitude, longitude);

create or replace function public.handle_dog_parks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dog_parks_set_updated_at
before update on public.dog_parks
for each row
execute function public.handle_dog_parks_updated_at();

alter table public.dog_parks enable row level security;

create policy "Authenticated users can view approved dog parks"
on public.dog_parks
for select
to authenticated
using (status = 'approved');

create policy "Users can view their own submitted dog parks"
on public.dog_parks
for select
to authenticated
using (created_by = auth.uid());

create policy "Users can submit dog parks for approval"
on public.dog_parks
for insert
to authenticated
with check (
  created_by = auth.uid()
  and status = 'pending'
);
