create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint subjects_name_not_empty check (length(trim(name)) > 0)
);

alter table public.subjects enable row level security;

drop policy if exists "subjects_authenticated_select_all" on public.subjects;
create policy "subjects_authenticated_select_all"
on public.subjects
for select
to authenticated
using (true);

alter table public.teacher_assignments
add column if not exists subject_id uuid references public.subjects(id) on delete cascade;

create index if not exists teacher_assignments_teacher_course_subject_idx
on public.teacher_assignments (teacher_id, course_id, subject_id);

create table if not exists public.partial_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  term text not null check (term in ('1', '2', '3')),
  assessment_type text not null check (assessment_type in ('parcial', 'trimestral')),
  assessment_name text not null,
  grade numeric(4,2) not null,
  assessment_date date,
  comment text,
  recommendation text,
  visible_to_family boolean not null default true,
  created_at timestamptz not null default now(),
  constraint partial_grades_assessment_name_not_empty check (length(trim(assessment_name)) > 0),
  constraint partial_grades_grade_range check (grade >= 0 and grade <= 10)
);

create index if not exists partial_grades_student_term_idx
on public.partial_grades (student_id, term, created_at desc);

create index if not exists partial_grades_teacher_idx
on public.partial_grades (teacher_id, created_at desc);

create index if not exists partial_grades_subject_idx
on public.partial_grades (subject_id, created_at desc);

alter table public.partial_grades enable row level security;

drop policy if exists "partial_grades_teacher_select_assigned" on public.partial_grades;
create policy "partial_grades_teacher_select_assigned"
on public.partial_grades
for select
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students s
    join public.teacher_assignments ta
      on ta.teacher_id = auth.uid()
     and ta.course_id = s.course_id
     and ta.subject_id = partial_grades.subject_id
    where s.id = partial_grades.student_id
      and s.course_id = partial_grades.course_id
  )
);

drop policy if exists "partial_grades_teacher_insert_assigned" on public.partial_grades;
create policy "partial_grades_teacher_insert_assigned"
on public.partial_grades
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students s
    join public.teacher_assignments ta
      on ta.teacher_id = auth.uid()
     and ta.course_id = s.course_id
     and ta.subject_id = partial_grades.subject_id
    where s.id = partial_grades.student_id
      and s.course_id = partial_grades.course_id
  )
);

drop policy if exists "partial_grades_teacher_update_assigned" on public.partial_grades;
create policy "partial_grades_teacher_update_assigned"
on public.partial_grades
for update
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students s
    join public.teacher_assignments ta
      on ta.teacher_id = auth.uid()
     and ta.course_id = s.course_id
     and ta.subject_id = partial_grades.subject_id
    where s.id = partial_grades.student_id
      and s.course_id = partial_grades.course_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students s
    join public.teacher_assignments ta
      on ta.teacher_id = auth.uid()
     and ta.course_id = s.course_id
     and ta.subject_id = partial_grades.subject_id
    where s.id = partial_grades.student_id
      and s.course_id = partial_grades.course_id
  )
);

drop policy if exists "partial_grades_family_select_children_visible" on public.partial_grades;
create policy "partial_grades_family_select_children_visible"
on public.partial_grades
for select
to authenticated
using (
  visible_to_family = true
  and exists (
    select 1
    from public.parent_students ps
    where ps.parent_id = auth.uid()
      and ps.student_id = partial_grades.student_id
  )
);

drop policy if exists "partial_grades_director_select_all" on public.partial_grades;
create policy "partial_grades_director_select_all"
on public.partial_grades
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "partial_grades_superadmin_select_all" on public.partial_grades;
create policy "partial_grades_superadmin_select_all"
on public.partial_grades
for select
to authenticated
using (public.current_user_has_role('superadmin'));
