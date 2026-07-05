create or replace function private.get_my_blocked_users_impl()
returns table (
  blocked_user_id uuid,
  display_name text,
  email text,
  blocked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  return query
  select
    user_blocks.blocked_user_id,
    private.get_user_display_name(user_blocks.blocked_user_id),
    blocked_user.email::text,
    user_blocks.created_at
  from public.user_blocks
  join auth.users as blocked_user
    on blocked_user.id = user_blocks.blocked_user_id
  where user_blocks.blocker_user_id = auth.uid()
  order by user_blocks.created_at desc, user_blocks.id desc;
end;
$$;

revoke all on function private.get_my_blocked_users_impl() from public;
grant execute on function private.get_my_blocked_users_impl() to authenticated;

create or replace function public.get_my_blocked_users()
returns table (
  blocked_user_id uuid,
  display_name text,
  email text,
  blocked_at timestamptz
)
language sql
security invoker
set search_path = ''
stable
as $$
  select *
  from private.get_my_blocked_users_impl();
$$;

revoke all on function public.get_my_blocked_users() from public;
grant execute on function public.get_my_blocked_users() to authenticated;
