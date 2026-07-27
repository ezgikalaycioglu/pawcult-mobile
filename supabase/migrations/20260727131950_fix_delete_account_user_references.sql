alter table public.pet_profiles
drop constraint if exists pet_profiles_created_by_user_id_fkey;

alter table public.pet_profiles
add constraint pet_profiles_created_by_user_id_fkey
foreign key (created_by_user_id)
references auth.users(id)
on delete set null;

alter table public.pet_owners
drop constraint if exists pet_owners_invited_by_user_id_fkey;

alter table public.pet_owners
add constraint pet_owners_invited_by_user_id_fkey
foreign key (invited_by_user_id)
references auth.users(id)
on delete set null;

alter table public.pet_owner_invites
drop constraint if exists pet_owner_invites_invited_by_user_id_fkey;

alter table public.pet_owner_invites
add constraint pet_owner_invites_invited_by_user_id_fkey
foreign key (invited_by_user_id)
references auth.users(id)
on delete cascade;
