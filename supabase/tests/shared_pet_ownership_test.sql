BEGIN;
SELECT plan(39);

create temp table test_ids (
  key text primary key,
  id uuid not null
);

insert into test_ids (key, id)
values
  ('ezgi', '00000000-0000-0000-0000-000000000001'),
  ('caner', '00000000-0000-0000-0000-000000000002'),
  ('stranger', '00000000-0000-0000-0000-000000000003'),
  ('new_owner', '00000000-0000-0000-0000-000000000004'),
  ('decliner', '00000000-0000-0000-0000-000000000005'),
  ('park', '00000000-0000-0000-0000-000000000010'),
  ('robiko', '00000000-0000-0000-0000-000000000020'),
  ('private_pet', '00000000-0000-0000-0000-000000000021');

create temp table invite_tokens (
  key text primary key,
  token uuid not null
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    (select id from test_ids where key = 'ezgi'),
    'authenticated',
    'authenticated',
    'ezgi@example.test',
    'test-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    (select id from test_ids where key = 'caner'),
    'authenticated',
    'authenticated',
    'caner@example.test',
    'test-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    (select id from test_ids where key = 'stranger'),
    'authenticated',
    'authenticated',
    'stranger@example.test',
    'test-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    (select id from test_ids where key = 'decliner'),
    'authenticated',
    'authenticated',
    'decliner@example.test',
    'test-password',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

create or replace function pg_temp.authenticate_as(
  target_user_id uuid,
  target_email text
)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', target_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub',
      target_user_id::text,
      'role',
      'authenticated',
      'email',
      target_email
    )::text,
    true
  );
end;
$$;

insert into public.dog_parks (
  id,
  name,
  latitude,
  longitude,
  status,
  created_by
)
values (
  (select id from test_ids where key = 'park'),
  'Shared Ownership Test Park',
  59.3293,
  18.0686,
  'approved',
  (select id from test_ids where key = 'ezgi')
);

set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'ezgi'),
  'ezgi@example.test'
);

insert into public.pet_profiles (
  id,
  user_id,
  created_by_user_id,
  name,
  breed
)
values
  (
    (select id from test_ids where key = 'robiko'),
    (select id from test_ids where key = 'ezgi'),
    (select id from test_ids where key = 'ezgi'),
    'Robiko',
    'Mixed'
  ),
  (
    (select id from test_ids where key = 'private_pet'),
    (select id from test_ids where key = 'ezgi'),
    (select id from test_ids where key = 'ezgi'),
    'Private Pet',
    'Mixed'
  );

select is(
  (
    select count(*)::int
    from public.pet_owners
    where pet_id in (
      (select id from test_ids where key = 'robiko'),
      (select id from test_ids where key = 'private_pet')
    )
      and user_id = (select id from test_ids where key = 'ezgi')
      and status = 'active'
  ),
  2,
  'new and backfilled-style pets have active owner rows'
);

update public.pet_profiles
set bio = 'Original owner can edit Robiko.'
where id = (select id from test_ids where key = 'robiko');

select is(
  (
    select bio
    from public.pet_profiles
    where id = (select id from test_ids where key = 'robiko')
  ),
  'Original owner can edit Robiko.',
  'original owner can still see and edit their pet'
);

insert into invite_tokens (key, token)
select 'caner', token
from public.create_pet_owner_invite(
  (select id from test_ids where key = 'robiko'),
  'Caner@Example.Test'
);

select is(
  (
    select invited_email
    from public.pet_owner_invites
    where token = (select token from invite_tokens where key = 'caner')
  ),
  'caner@example.test',
  'owner can create an invite and the email is normalized'
);

select is(
  (
    select token
    from public.create_pet_owner_invite(
      (select id from test_ids where key = 'robiko'),
      'caner@example.test'
    )
  ),
  (select token from invite_tokens where key = 'caner'),
  'existing pending invite is reused'
);

insert into invite_tokens (key, token)
select 'new_owner', token
from public.create_pet_owner_invite(
  (select id from test_ids where key = 'robiko'),
  'new-owner@example.test'
);

insert into invite_tokens (key, token)
select 'decliner', token
from public.create_pet_owner_invite(
  (select id from test_ids where key = 'robiko'),
  'decliner@example.test'
);

insert into invite_tokens (key, token)
select 'cancel', token
from public.create_pet_owner_invite(
  (select id from test_ids where key = 'robiko'),
  'cancel@example.test'
);

select is(
  (
    select count(*)::int
    from public.get_pet_owner_requests('sent')
  ),
  4,
  'active owner can list sent pet owner requests'
);

select is(
  (
    select pet_name
    from public.get_pet_owner_requests('sent')
    where invited_email = 'caner@example.test'
  ),
  'Robiko',
  'sent pet owner request includes pet name'
);

select is(
  public.cancel_pet_owner_invite(
    (
      select id
      from public.pet_owner_invites
      where token = (select token from invite_tokens where key = 'cancel')
    )
  ),
  (select id from test_ids where key = 'robiko'),
  'active owner can cancel a sent pet owner request'
);

select is(
  (
    select status
    from public.pet_owner_invites
    where token = (select token from invite_tokens where key = 'cancel')
  ),
  'canceled',
  'canceled sent pet owner request stores canceled status'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'stranger'),
  'stranger@example.test'
);

select throws_ok(
  $$
    select public.create_pet_owner_invite(
      '00000000-0000-0000-0000-000000000020',
      'other@example.test'
    )
  $$,
  'P0001',
  'not_pet_owner',
  'non-owner cannot create an invite'
);

select throws_ok(
  $$
    select public.accept_pet_owner_invite(
      (select token from invite_tokens where key = 'caner')
    )
  $$,
  'P0001',
  'email_mismatch',
  'user with different email cannot accept'
);

select is(
  (
    select count(*)::int
    from public.get_pet_owner_requests('incoming')
  ),
  0,
  'user without matching invite email cannot list incoming pet owner requests'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'caner'),
  'caner@example.test'
);

select is(
  (
    select count(*)::int
    from public.get_pet_owner_requests('incoming')
  ),
  1,
  'invited user can list incoming pet owner requests'
);

select is(
  public.accept_pet_owner_request(
    (
      select id
      from public.pet_owner_invites
      where token = (select token from invite_tokens where key = 'caner')
    )
  ),
  (select id from test_ids where key = 'robiko'),
  'user with matching email can accept from request sheet'
);

select ok(
  exists (
    select 1
    from public.pet_owners
    where pet_id = (select id from test_ids where key = 'robiko')
      and user_id = (select id from test_ids where key = 'caner')
      and status = 'active'
  ),
  'accepted invite creates an active owner row'
);

select is(
  (
    select count(*)::int
    from public.pet_profiles
    where id = (select id from test_ids where key = 'robiko')
  ),
  1,
  'invited owner can see the shared pet after accepting'
);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  (select id from test_ids where key = 'new_owner'),
  'authenticated',
  'authenticated',
  'new-owner@example.test',
  'test-password',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'new_owner'),
  'new-owner@example.test'
);

select is(
  public.accept_pet_owner_invite(
    (select token from invite_tokens where key = 'new_owner')
  ),
  (select id from test_ids where key = 'robiko'),
  'user without account can sign up later, return to invite, and accept'
);

select is(
  (
    select count(*)::int
    from public.pet_profiles
    where id = (select id from test_ids where key = 'robiko')
  ),
  1,
  'pet appears in invited user My Pets list after accept'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'decliner'),
  'decliner@example.test'
);

select is(
  public.decline_pet_owner_request(
    (
      select id
      from public.pet_owner_invites
      where token = (select token from invite_tokens where key = 'decliner')
    )
  ),
  (select id from test_ids where key = 'robiko'),
  'invited user can decline from request sheet'
);

select is(
  (
    select status
    from public.pet_owner_invites
    where token = (select token from invite_tokens where key = 'decliner')
  ),
  'declined',
  'declined pet owner request stores declined status'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'ezgi'),
  'ezgi@example.test'
);

select is(
  (
    select count(*)::int
    from public.get_pet_owner_summaries(
      (select id from test_ids where key = 'robiko')
    )
  ),
  3,
  'active owner can view all active pet parents'
);

select lives_ok(
  $$
    insert into public.dog_park_checkins (
      dog_park_id,
      user_id,
      pet_id,
      starts_at,
      ends_at
    )
    values (
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000020',
      now(),
      now() + interval '1 hour'
    )
  $$,
  'original owner can check in their pet'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'caner'),
  'caner@example.test'
);

select lives_ok(
  $$
    insert into public.dog_park_checkins (
      dog_park_id,
      user_id,
      pet_id,
      starts_at,
      ends_at
    )
    values (
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000020',
      now() + interval '2 hours',
      now() + interval '3 hours'
    )
  $$,
  'invited owner can create scheduled check-ins for the shared pet'
);

select is(
  (
    select count(*)::int
    from public.dog_park_checkins
    where pet_id = (select id from test_ids where key = 'robiko')
      and checked_out_at is null
  ),
  2,
  'scheduled and active check-ins work with shared pets'
);

select is(
  (
    select count(*)::int
    from public.dog_park_checkin_attendees
    where user_id in (
      (select id from test_ids where key = 'ezgi'),
      (select id from test_ids where key = 'caner')
    )
  ),
  2,
  'check-in creators are inserted as attendees'
);

select is(
  (
    select status
    from public.send_friend_request_by_email('ezgi@example.test')
  ),
  'sent',
  'user can send a friend request by email'
);

select is(
  (
    select status
    from public.send_friend_request_by_email('ezgi@example.test')
  ),
  'request_pending',
  'duplicate outgoing friend request is not recreated'
);

select is(
  (
    select count(*)::int
    from public.get_friend_requests('sent')
  ),
  1,
  'requester can list sent friend requests'
);

select is(
  (
    select status
    from public.send_friend_request_by_email('missing@example.test')
  ),
  'no_account',
  'unknown friend email returns no account status'
);

select is(
  (
    select status
    from public.send_friend_request_by_email('caner@example.test')
  ),
  'self',
  'user cannot add themselves as a friend'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'ezgi'),
  'ezgi@example.test'
);

select is(
  (
    select count(*)::int
    from public.get_friend_requests('incoming')
  ),
  1,
  'addressee can list incoming friend requests'
);

select is(
  public.respond_friend_request(
    (
      select id
      from public.user_friends
      where requester_user_id = (select id from test_ids where key = 'caner')
        and addressee_user_id = (select id from test_ids where key = 'ezgi')
    ),
    'accept'
  ),
  (
    select id
    from public.user_friends
    where requester_user_id = (select id from test_ids where key = 'caner')
      and addressee_user_id = (select id from test_ids where key = 'ezgi')
  ),
  'addressee can accept incoming friend request'
);

select is(
  (
    select count(*)::int
    from public.get_my_friends()
  ),
  1,
  'accepted friendship appears in my friends'
);

select is(
  (
    select status
    from public.send_friend_request_by_email('caner@example.test')
  ),
  'already_friends',
  'accepted friends cannot create duplicate requests'
);

select is(
  (
    select public.get_friend_profile(
      (select id from test_ids where key = 'caner')
    ) ->> 'userId'
  ),
  (select id::text from test_ids where key = 'caner'),
  'friend can view friend profile'
);

select ok(
  exists (
    select 1
    from public.get_visible_dog_park_checkins()
    where user_id = (select id from test_ids where key = 'caner')
      and is_friend
      and user_email = 'caner@example.test'
  ),
  'friend check-in feed includes friend attending user info'
);

reset role;
set local role authenticated;
select pg_temp.authenticate_as(
  (select id from test_ids where key = 'stranger'),
  'stranger@example.test'
);

select throws_ok(
  $$
    select public.get_friend_profile(
      '00000000-0000-0000-0000-000000000002'
    )
  $$,
  'P0001',
  'not_friends',
  'non-friend cannot view friend profile'
);

select ok(
  not exists (
    select 1
    from public.get_visible_dog_park_checkins()
    where user_id = (select id from test_ids where key = 'caner')
      and user_email is not null
  ),
  'non-friend check-in feed does not expose attending user email'
);

select is(
  (
    select count(*)::int
    from public.pet_profiles
    where id = (select id from test_ids where key = 'private_pet')
  ),
  0,
  'non-owner cannot see a private pet profile'
);

select throws_ok(
  $$
    select *
    from public.get_pet_owner_summaries(
      '00000000-0000-0000-0000-000000000021'
    )
  $$,
  'P0001',
  'not_pet_owner',
  'non-owner cannot view pet parent summaries'
);

select throws_ok(
  $$
    insert into public.dog_park_checkins (
      dog_park_id,
      user_id,
      pet_id,
      starts_at,
      ends_at
    )
    values (
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000021',
      now(),
      now() + interval '1 hour'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "dog_park_checkins"',
  'non-owner cannot check in with a pet they do not own'
);

SELECT * FROM finish();
ROLLBACK;
