create table public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  breed text not null,
  bio text null,
  profile_photo_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pet_profiles_name_length check (char_length(name) <= 50),
  constraint pet_profiles_breed_length check (char_length(breed) <= 100),
  constraint pet_profiles_bio_length check (bio is null or char_length(bio) <= 500)
);

create index idx_pet_profiles_user_id on public.pet_profiles(user_id);
create index idx_pet_profiles_created_at on public.pet_profiles(created_at desc);

create or replace function public.handle_pet_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pet_profiles_set_updated_at
before update on public.pet_profiles
for each row
execute function public.handle_pet_profiles_updated_at();

alter table public.pet_profiles enable row level security;

create policy "Users can view their own pets"
on public.pet_profiles
for select
using (auth.uid() = user_id);

create policy "Users can create their own pets"
on public.pet_profiles
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own pets"
on public.pet_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own pets"
on public.pet_profiles
for delete
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;

create policy "Anyone can view pet photos"
on storage.objects
for select
using (bucket_id = 'pet-photos');

create policy "Authenticated users can upload their own pet photos"
on storage.objects
for insert
with check (
  bucket_id = 'pet-photos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own pet photos"
on storage.objects
for update
using (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own pet photos"
on storage.objects
for delete
using (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
