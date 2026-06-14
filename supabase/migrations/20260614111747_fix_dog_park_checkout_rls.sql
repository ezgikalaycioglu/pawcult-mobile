drop policy if exists "Users can view their own dog park check-ins"
on public.dog_park_checkins;

create policy "Users can view their own dog park check-ins"
on public.dog_park_checkins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can check out their own dog park check-ins"
on public.dog_park_checkins;

create policy "Users can check out their own dog park check-ins"
on public.dog_park_checkins
for update
to authenticated
using (
  user_id = auth.uid()
  and checked_out_at is null
  and ends_at > now()
  and starts_at <= now()
)
with check (
  user_id = auth.uid()
  and checked_out_at is not null
);
