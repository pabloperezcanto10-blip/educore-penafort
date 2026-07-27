-- DO NOT APPLY - DESIGN ONLY - SPRINT 20.2A
-- Proposed Wave 2. Nullable columns first; constraints wait for 039.

begin;

alter table public.academic_years
  add column if not exists school_id uuid references public.schools(id);
alter table public.courses
  add column if not exists school_id uuid references public.schools(id);
alter table public.subjects
  add column if not exists school_id uuid references public.schools(id);
alter table public.course_subjects
  add column if not exists school_id uuid references public.schools(id);

update public.academic_years
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.subjects
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.courses course
set school_id = academic_year.school_id
from public.academic_years academic_year
where academic_year.id = course.academic_year_id
  and course.school_id is null;

update public.course_subjects relation
set school_id = course.school_id
from public.courses course
where course.id = relation.course_id
  and relation.school_id is null;

do $postconditions$
begin
  if exists (
    select 1
    from public.course_subjects relation
    join public.courses course on course.id = relation.course_id
    join public.subjects subject on subject.id = relation.subject_id
    join public.academic_years academic_year
      on academic_year.id = relation.academic_year_id
    where relation.school_id is distinct from course.school_id
       or relation.school_id is distinct from subject.school_id
       or relation.school_id is distinct from academic_year.school_id
  ) then
    raise exception 'Configuration has cross-school relationships.';
  end if;
end
$postconditions$;

create index if not exists academic_years_school_id_idx on public.academic_years (school_id);
create index if not exists courses_school_id_idx on public.courses (school_id);
create index if not exists subjects_school_id_idx on public.subjects (school_id);
create index if not exists course_subjects_school_id_idx on public.course_subjects (school_id);

commit;
