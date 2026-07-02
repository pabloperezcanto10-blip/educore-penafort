alter table public.students enable row level security;

drop policy if exists "students_director_can_read_all_students" on public.students;

create policy "students_director_can_read_all_students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'director'
  )
);
