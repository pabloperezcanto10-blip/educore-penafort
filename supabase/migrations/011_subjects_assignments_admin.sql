alter table public.subjects enable row level security;

drop policy if exists "subjects_superadmin_insert_all" on public.subjects;
create policy "subjects_superadmin_insert_all"
on public.subjects
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "subjects_superadmin_update_all" on public.subjects;
create policy "subjects_superadmin_update_all"
on public.subjects
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

alter table public.teacher_assignments enable row level security;

drop policy if exists "teacher_assignments_teacher_select_own" on public.teacher_assignments;
create policy "teacher_assignments_teacher_select_own"
on public.teacher_assignments
for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "teacher_assignments_superadmin_select_all" on public.teacher_assignments;
create policy "teacher_assignments_superadmin_select_all"
on public.teacher_assignments
for select
to authenticated
using (public.current_user_has_role('superadmin'));

drop policy if exists "teacher_assignments_superadmin_insert_all" on public.teacher_assignments;
create policy "teacher_assignments_superadmin_insert_all"
on public.teacher_assignments
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "teacher_assignments_superadmin_update_all" on public.teacher_assignments;
create policy "teacher_assignments_superadmin_update_all"
on public.teacher_assignments
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

insert into public.subjects (name)
select subject_name
from (
  values
    ('Matemáticas'),
    ('Ciencias'),
    ('Inglés'),
    ('Valenciano'),
    ('Lengua Castellana'),
    ('Cambridge'),
    ('Música'),
    ('Educación Física'),
    ('Latín'),
    ('Biología'),
    ('Física y Química'),
    ('Economía')
) as seed(subject_name)
where not exists (
  select 1
  from public.subjects s
  where lower(s.name) = lower(seed.subject_name)
);

insert into public.teacher_assignments (teacher_id, course_id, subject_id)
select tutor.id, course.id, subject.id
from public.profiles tutor
join public.courses course on course.name = '6º Primaria'
join public.subjects subject on subject.name in ('Matemáticas', 'Ciencias')
where tutor.email = 'tutor.prueba@penafort.com'
  and not exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = tutor.id
      and ta.course_id = course.id
      and ta.subject_id = subject.id
  );
