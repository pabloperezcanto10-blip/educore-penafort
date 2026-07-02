alter table public.students enable row level security;

drop policy if exists "students_tutor_can_read_assigned_students" on public.students;

create policy "students_tutor_can_read_assigned_students"
on public.students
for select
to authenticated
using (
  tutor_teacher_id = auth.uid()
);
