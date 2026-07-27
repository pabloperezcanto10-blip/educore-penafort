-- DO NOT APPLY - DESIGN ONLY - SPRINT 20.2A
-- Proposed Wave 3. No Auth user, email or relationship is changed.

begin;

alter table public.students add column if not exists school_id uuid references public.schools(id);
alter table public.families add column if not exists school_id uuid references public.schools(id);
alter table public.student_families add column if not exists school_id uuid references public.schools(id);
alter table public.parent_students add column if not exists school_id uuid references public.schools(id);
alter table public.teachers add column if not exists school_id uuid references public.schools(id);
alter table public.teacher_assignments add column if not exists school_id uuid references public.schools(id);

update public.students student
set school_id = course.school_id
from public.courses course
where course.id = student.course_id and student.school_id is null;

update public.families
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.teachers
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.student_families relation
set school_id = student.school_id
from public.students student
where student.id = relation.student_id and relation.school_id is null;

update public.parent_students relation
set school_id = student.school_id
from public.students student
where student.id = relation.student_id and relation.school_id is null;

update public.teacher_assignments assignment
set school_id = course.school_id
from public.courses course
where course.id = assignment.course_id and assignment.school_id is null;

do $postconditions$
begin
  if exists (
    select 1
    from public.parent_students relation
    left join public.school_memberships membership
      on membership.user_id = relation.parent_id
     and membership.school_id = relation.school_id
     and membership.role = 'family'
     and membership.active
    where membership.id is null
  ) then
    raise exception 'A parent relation lacks an active family membership.';
  end if;

  if exists (
    select 1
    from public.teacher_assignments assignment
    join public.courses course on course.id = assignment.course_id
    join public.subjects subject on subject.id = assignment.subject_id
    join public.academic_years academic_year
      on academic_year.id = assignment.academic_year_id
    where assignment.school_id is distinct from course.school_id
       or assignment.school_id is distinct from subject.school_id
       or assignment.school_id is distinct from academic_year.school_id
  ) then
    raise exception 'A teacher assignment crosses school boundaries.';
  end if;
end
$postconditions$;

create index if not exists students_school_id_idx on public.students (school_id);
create index if not exists families_school_id_idx on public.families (school_id);
create index if not exists student_families_school_id_idx on public.student_families (school_id);
create index if not exists parent_students_school_id_idx on public.parent_students (school_id);
create index if not exists teachers_school_id_idx on public.teachers (school_id);
create index if not exists teacher_assignments_school_id_idx on public.teacher_assignments (school_id);

commit;
