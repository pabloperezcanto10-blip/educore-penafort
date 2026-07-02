drop policy if exists "notifications_family_insert_staff" on public.notifications;

create policy "notifications_family_insert_staff"
on public.notifications
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and read = false
  and read_at is null
  and public.current_user_has_role('family')
  and exists (
    select 1
    from public.parent_students ps
    where ps.parent_id = auth.uid()
      and ps.student_id = notifications.student_id
  )
  and (
    exists (
      select 1
      from public.students s
      where s.id = notifications.student_id
        and s.tutor_teacher_id = notifications.receiver_id
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = notifications.receiver_id
        and p.role = 'director'
    )
  )
);
