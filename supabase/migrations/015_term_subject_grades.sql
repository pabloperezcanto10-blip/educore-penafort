create table if not exists public.term_subject_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  term text not null check (term in ('1', '2', '3')),
  calculated_grade numeric(4,2),
  final_grade integer,
  final_observation text,
  status text not null default 'draft' check (status in ('draft', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint term_subject_grades_calculated_range check (calculated_grade is null or (calculated_grade >= 0 and calculated_grade <= 10)),
  constraint term_subject_grades_final_range check (final_grade is null or (final_grade >= 0 and final_grade <= 10)),
  constraint term_subject_grades_closed_requires_grades check (
    status = 'draft'
    or (calculated_grade is not null and final_grade is not null and closed_at is not null)
  ),
  constraint term_subject_grades_unique_student_subject_term unique (student_id, subject_id, term)
);

create index if not exists term_subject_grades_teacher_lookup_idx
on public.term_subject_grades (teacher_id, course_id, subject_id, term, status);

create or replace function public.set_term_subject_grades_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_term_subject_grades_updated_at on public.term_subject_grades;
create trigger set_term_subject_grades_updated_at
before update on public.term_subject_grades
for each row
execute function public.set_term_subject_grades_updated_at();

alter table public.term_subject_grades enable row level security;

drop policy if exists "term_subject_grades_teacher_select_assigned" on public.term_subject_grades;
create policy "term_subject_grades_teacher_select_assigned"
on public.term_subject_grades
for select
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = term_subject_grades.course_id
      and ta.subject_id = term_subject_grades.subject_id
  )
);

drop policy if exists "term_subject_grades_teacher_insert_assigned" on public.term_subject_grades;
create policy "term_subject_grades_teacher_insert_assigned"
on public.term_subject_grades
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = term_subject_grades.course_id
      and ta.subject_id = term_subject_grades.subject_id
  )
);

drop policy if exists "term_subject_grades_teacher_update_assigned" on public.term_subject_grades;
create policy "term_subject_grades_teacher_update_assigned"
on public.term_subject_grades
for update
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = term_subject_grades.course_id
      and ta.subject_id = term_subject_grades.subject_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = term_subject_grades.course_id
      and ta.subject_id = term_subject_grades.subject_id
  )
);

drop policy if exists "term_subject_grades_director_select_all" on public.term_subject_grades;
create policy "term_subject_grades_director_select_all"
on public.term_subject_grades
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "term_subject_grades_superadmin_select_all" on public.term_subject_grades;
create policy "term_subject_grades_superadmin_select_all"
on public.term_subject_grades
for select
to authenticated
using (public.current_user_has_role('superadmin'));
