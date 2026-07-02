drop policy if exists "student_attendance_family_update_justification" on public.student_attendance;

create policy "student_attendance_family_update_justification"
on public.student_attendance
for update
to authenticated
using (
  exists (
    select 1
    from public.parent_students ps
    where ps.student_id = student_attendance.student_id
      and ps.parent_id = auth.uid()
  )
)
with check (
  status in ('absent', 'late')
  and justified = true
  and justification_text is not null
  and exists (
    select 1
    from public.parent_students ps
    where ps.student_id = student_attendance.student_id
      and ps.parent_id = auth.uid()
  )
);
