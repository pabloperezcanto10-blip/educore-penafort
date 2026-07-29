-- SPRINT 20.2G-R2B
-- Extend tutor SELECT access to students in courses they teach. The active
-- tutor membership and active school boundary remain enforced by
-- has_school_role; 037's composite FKs keep the academic roots tenant-safe.

begin;

do $preconditions$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'students'
      and policyname = 'students_tutor_can_read_assigned_students'
      and cmd = 'SELECT'
  ) then
    raise exception 'Refusing 038: the tutor students SELECT policy is missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.students'::regclass
      and conname = 'students_course_school_fkey'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.students'::regclass
      and conname = 'students_academic_year_school_fkey'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.teacher_assignments'::regclass
      and conname = 'teacher_assignments_course_school_fkey'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.teacher_assignments'::regclass
      and conname = 'teacher_assignments_academic_year_school_fkey'
  ) then
    raise exception 'Refusing 038: required tenant-aware academic constraints are missing.';
  end if;
end
$preconditions$;

alter policy "students_tutor_can_read_assigned_students"
on public.students
using (
  public.has_school_role(
    students.school_id,
    array['tutor']::public.app_role[]
  )
  and (
    students.tutor_teacher_id = auth.uid()
    or exists (
      select 1
      from public.teacher_assignments assignment
      where assignment.teacher_id = auth.uid()
        and assignment.school_id = students.school_id
        and assignment.course_id = students.course_id
        and assignment.academic_year_id = students.academic_year_id
    )
  )
);

comment on policy "students_tutor_can_read_assigned_students"
on public.students is
  'Tutor SELECT is limited to direct tutoring or a matching teacher assignment in an active tutor membership school.';

commit;
