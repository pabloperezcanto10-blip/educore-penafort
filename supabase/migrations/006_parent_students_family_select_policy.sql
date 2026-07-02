alter table public.parent_students enable row level security;

drop policy if exists "parent_students_family_select_own" on public.parent_students;
create policy "parent_students_family_select_own"
on public.parent_students
for select
to authenticated
using (parent_id = auth.uid());
