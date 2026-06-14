create policy "Users can cancel their own scheduled dog park check-ins"
on public.dog_park_checkins
for delete
to authenticated
using (
  user_id = auth.uid()
  and checked_out_at is null
  and starts_at > now()
);
