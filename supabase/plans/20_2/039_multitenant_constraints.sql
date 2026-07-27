-- DO NOT APPLY - DESIGN ONLY - SPRINT 20.2A
-- Proposed Wave 5a. Promote only after all pre/post checks return zero.

begin;

do $null_gate$
declare
  table_name text;
  null_total bigint;
begin
  foreach table_name in array array[
    'academic_years', 'courses', 'subjects', 'course_subjects',
    'students', 'families', 'student_families', 'parent_students',
    'teachers', 'teacher_assignments', 'teacher_schedule',
    'annual_evaluation_weights', 'attendance_records',
    'evaluation_criteria', 'evaluation_publications',
    'final_course_grades', 'final_evaluation_publications',
    'internal_notifications', 'notifications', 'partial_grades',
    'quarter_final_grades', 'student_attendance', 'student_incidents',
    'student_observations', 'term_subject_grades'
  ]
  loop
    execute format('select count(*) from public.%I where school_id is null', table_name)
      into null_total;
    if null_total <> 0 then
      raise exception '% contains % rows without school_id.', table_name, null_total;
    end if;
  end loop;
end
$null_gate$;

create unique index if not exists academic_years_id_school_unique
  on public.academic_years (id, school_id);
create unique index if not exists courses_id_school_unique
  on public.courses (id, school_id);
create unique index if not exists subjects_id_school_unique
  on public.subjects (id, school_id);
create unique index if not exists students_id_school_unique
  on public.students (id, school_id);
create unique index if not exists families_id_school_unique
  on public.families (id, school_id);
create unique index if not exists teachers_id_school_unique
  on public.teachers (id, school_id);
create unique index if not exists teacher_schedule_id_school_unique
  on public.teacher_schedule (id, school_id);

create unique index if not exists academic_years_active_school_unique
  on public.academic_years (school_id)
  where active;
create unique index if not exists academic_years_name_school_unique
  on public.academic_years (school_id, name);
create unique index if not exists courses_name_year_school_unique
  on public.courses (school_id, academic_year_id, name);
create unique index if not exists subjects_name_school_unique
  on public.subjects (school_id, name);

alter table public.courses
  add constraint courses_year_school_fk
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id)
  not valid;
alter table public.students
  add constraint students_course_school_fk
  foreign key (course_id, school_id)
  references public.courses (id, school_id)
  not valid;
alter table public.course_subjects
  add constraint course_subjects_course_school_fk
  foreign key (course_id, school_id)
  references public.courses (id, school_id)
  not valid;
alter table public.course_subjects
  add constraint course_subjects_subject_school_fk
  foreign key (subject_id, school_id)
  references public.subjects (id, school_id)
  not valid;
alter table public.parent_students
  add constraint parent_students_student_school_fk
  foreign key (student_id, school_id)
  references public.students (id, school_id)
  not valid;
alter table public.student_families
  add constraint student_families_student_school_fk
  foreign key (student_id, school_id)
  references public.students (id, school_id)
  not valid;
alter table public.student_families
  add constraint student_families_family_school_fk
  foreign key (family_id, school_id)
  references public.families (id, school_id)
  not valid;
alter table public.teacher_assignments
  add constraint teacher_assignments_course_school_fk
  foreign key (course_id, school_id)
  references public.courses (id, school_id)
  not valid;
alter table public.teacher_assignments
  add constraint teacher_assignments_subject_school_fk
  foreign key (subject_id, school_id)
  references public.subjects (id, school_id)
  not valid;

-- The same student/course/subject/year composite pattern must be added to
-- attendance, criteria, weights, grades and publications before promotion.
-- User references require the membership trigger designed below.

create or replace function public.assert_active_school_membership()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidate_user_id uuid;
begin
  candidate_user_id := coalesce(
    (to_jsonb(new) ->> 'teacher_id')::uuid,
    (to_jsonb(new) ->> 'tutor_id')::uuid,
    (to_jsonb(new) ->> 'user_id')::uuid,
    (to_jsonb(new) ->> 'parent_id')::uuid
  );

  if candidate_user_id is not null and not exists (
    select 1 from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = candidate_user_id
      and membership.school_id = new.school_id
      and membership.active
      and school.active
  ) then
    raise exception 'User has no active membership in the row school.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- SET NOT NULL and VALIDATE CONSTRAINT are intentionally the last two actions
-- when this draft is promoted. They must follow a complete composite-FK review.

commit;
