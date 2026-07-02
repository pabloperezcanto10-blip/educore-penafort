create table if not exists public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  term text not null check (term in ('1', '2', '3')),
  name text not null,
  weight numeric(5,2) not null,
  criterion_type text not null check (
    criterion_type in ('parcial', 'trimestral', 'comportamiento', 'libreta', 'oral', 'proyecto', 'actitud', 'otro')
  ),
  visible_to_family boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint evaluation_criteria_name_not_empty check (length(trim(name)) > 0),
  constraint evaluation_criteria_weight_range check (weight > 0 and weight <= 100),
  constraint evaluation_criteria_unique_name unique (teacher_id, course_id, subject_id, term, name)
);

create index if not exists evaluation_criteria_lookup_idx
on public.evaluation_criteria (teacher_id, course_id, subject_id, term, active);

alter table public.evaluation_criteria enable row level security;

drop policy if exists "evaluation_criteria_teacher_select_own" on public.evaluation_criteria;
create policy "evaluation_criteria_teacher_select_own"
on public.evaluation_criteria
for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "evaluation_criteria_teacher_insert_own" on public.evaluation_criteria;
create policy "evaluation_criteria_teacher_insert_own"
on public.evaluation_criteria
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = evaluation_criteria.course_id
      and ta.subject_id = evaluation_criteria.subject_id
  )
);

drop policy if exists "evaluation_criteria_teacher_update_own" on public.evaluation_criteria;
create policy "evaluation_criteria_teacher_update_own"
on public.evaluation_criteria
for update
to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = evaluation_criteria.course_id
      and ta.subject_id = evaluation_criteria.subject_id
  )
);

drop policy if exists "evaluation_criteria_director_select_all" on public.evaluation_criteria;
create policy "evaluation_criteria_director_select_all"
on public.evaluation_criteria
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "evaluation_criteria_superadmin_select_all" on public.evaluation_criteria;
create policy "evaluation_criteria_superadmin_select_all"
on public.evaluation_criteria
for select
to authenticated
using (public.current_user_has_role('superadmin'));

create table if not exists public.quarter_final_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  term text not null check (term in ('1', '2', '3')),
  calculated_grade numeric(4,2) not null,
  final_grade numeric(4,2) not null,
  teacher_observation text,
  created_at timestamptz not null default now(),
  constraint quarter_final_grades_calculated_range check (calculated_grade >= 0 and calculated_grade <= 10),
  constraint quarter_final_grades_final_range check (final_grade >= 0 and final_grade <= 10),
  constraint quarter_final_grades_unique_student_term unique (student_id, subject_id, teacher_id, course_id, term)
);

create index if not exists quarter_final_grades_lookup_idx
on public.quarter_final_grades (teacher_id, course_id, subject_id, term);

alter table public.quarter_final_grades enable row level security;

drop policy if exists "quarter_final_grades_teacher_select_own" on public.quarter_final_grades;
create policy "quarter_final_grades_teacher_select_own"
on public.quarter_final_grades
for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "quarter_final_grades_teacher_insert_own" on public.quarter_final_grades;
create policy "quarter_final_grades_teacher_insert_own"
on public.quarter_final_grades
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = quarter_final_grades.course_id
      and ta.subject_id = quarter_final_grades.subject_id
  )
);

drop policy if exists "quarter_final_grades_teacher_update_own" on public.quarter_final_grades;
create policy "quarter_final_grades_teacher_update_own"
on public.quarter_final_grades
for update
to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = quarter_final_grades.course_id
      and ta.subject_id = quarter_final_grades.subject_id
  )
);

drop policy if exists "quarter_final_grades_director_select_all" on public.quarter_final_grades;
create policy "quarter_final_grades_director_select_all"
on public.quarter_final_grades
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "quarter_final_grades_superadmin_select_all" on public.quarter_final_grades;
create policy "quarter_final_grades_superadmin_select_all"
on public.quarter_final_grades
for select
to authenticated
using (public.current_user_has_role('superadmin'));
