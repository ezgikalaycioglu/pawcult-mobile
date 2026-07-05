# Mobile Supabase Migrations

This Supabase project lives under `mobile-app/supabase` and is independent from `web-app/supabase`.

## What is included

The initial migration creates:
- `public.pet_profiles`
- RLS policies for owner-only CRUD
- `pet-photos` storage bucket
- Storage policies for upload/update/delete in each user's own folder
- `public.dog_parks`
- RLS policies for public approved parks and creator-only pending submissions
- `public.dog_park_favorites`
- RLS policies for per-user favorite dog parks

## Local project setup

From the repo root:

```bash
cd mobile-app
supabase init
```

This repository already includes the generated Supabase folder and the first migration, so you do not need to run `supabase init` again unless you recreate the folder.

## Apply to your dev database (`pawcult-dev`)

1. Link this mobile Supabase project to your dev project:

```bash
cd mobile-app
supabase link --project-ref <pawcult-dev-project-ref>
```

2. Preview what will run:

```bash
supabase db push --dry-run
```

3. Apply the migrations:

```bash
supabase db push
```

## Apply to production later

When production is ready, link the same migration history to the production project and push the same files:

```bash
cd mobile-app
supabase link --project-ref <production-project-ref>
supabase db push --dry-run
supabase db push
```

## Optional local validation

If you want to test the migration locally with the Supabase local stack:

```bash
cd mobile-app
supabase db start
supabase migration up
supabase db lint
```

## Notes

- Keep `mobile-app/supabase/migrations` committed to git.
- Do not create separate SQL histories for dev and production.
- The same migration files should be applied to both environments.
- The moderation migration automatically adds `info.pawcult@gmail.com` to
  `public.app_admins` only if that Supabase Auth user already exists. If the
  account is created later, add it manually:

```sql
insert into public.app_admins (user_id)
select id
from auth.users
where lower(email) = 'info.pawcult@gmail.com'
on conflict (user_id) do nothing;
```

- Store pet photos under the path pattern:

```text
pet-photos/<auth.uid()>/<filename>
```
