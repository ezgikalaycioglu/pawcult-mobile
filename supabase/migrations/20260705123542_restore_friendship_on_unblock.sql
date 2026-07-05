create or replace function public.unblock_user(target_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.user_blocks
  where blocker_user_id = auth.uid()
    and blocked_user_id = target_user_id
  returning id into deleted_id;

  update public.user_friends
  set
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now())
  where status = 'blocked'
    and (
      (requester_user_id = auth.uid() and addressee_user_id = target_user_id)
      or (requester_user_id = target_user_id and addressee_user_id = auth.uid())
    );

  return deleted_id;
end;
$$;

revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;

update public.user_friends
set
  status = 'accepted',
  accepted_at = coalesce(accepted_at, now())
where status = 'blocked'
  and not exists (
    select 1
    from public.user_blocks
    where (
      user_blocks.blocker_user_id = user_friends.requester_user_id
      and user_blocks.blocked_user_id = user_friends.addressee_user_id
    ) or (
      user_blocks.blocker_user_id = user_friends.addressee_user_id
      and user_blocks.blocked_user_id = user_friends.requester_user_id
    )
  );
