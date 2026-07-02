drop policy if exists "notifications_director_insert" on public.notifications;

create policy "notifications_director_insert"
on public.notifications
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and read = false
  and read_at is null
  and public.current_user_has_role('director')
);
