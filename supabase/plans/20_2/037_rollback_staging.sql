-- STAGING ONLY - rollback for the controlled Sprint 20.2E rehearsal.
-- This is intentionally not a migration and must never run in production.

begin;

do $rollback_preconditions$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'students',
        'families',
        'student_families',
        'parent_students',
        'teachers',
        'teacher_assignments'
      )
      and column_name = 'school_id'
  ) <> 6 then
    raise exception 'Rollback 037 requires all six people school_id columns.';
  end if;

  if exists (select 1 from public.students)
     or exists (select 1 from public.families)
     or exists (select 1 from public.student_families)
     or exists (select 1 from public.parent_students)
     or exists (select 1 from public.teachers)
     or exists (select 1 from public.teacher_assignments) then
    raise exception 'Rollback 037 is blocked because a people table contains rows.';
  end if;
end
$rollback_preconditions$;

alter policy "students_director_can_read_all_students"
on public.students
using (
  exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'director'::public.app_role
  )
);

alter policy "students_superadmin_insert_all"
on public.students
with check (public.current_user_has_role('superadmin'));

alter policy "students_superadmin_select_all"
on public.students
using (public.current_user_has_role('superadmin'));

alter policy "students_superadmin_update_all"
on public.students
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

alter policy "students_tutor_can_read_assigned_students"
on public.students
using (tutor_teacher_id = auth.uid());

alter policy "parent_students_family_select_own"
on public.parent_students
using (parent_id = auth.uid());

alter policy "parent_students_superadmin_delete_all"
on public.parent_students
using (public.current_user_has_role('superadmin'));

alter policy "parent_students_superadmin_insert_all"
on public.parent_students
with check (public.current_user_has_role('superadmin'));

alter policy "parent_students_superadmin_select_all"
on public.parent_students
using (public.current_user_has_role('superadmin'));

alter policy "teacher_assignments_superadmin_insert_all"
on public.teacher_assignments
with check (public.current_user_has_role('superadmin'));

alter policy "teacher_assignments_superadmin_select_all"
on public.teacher_assignments
using (public.current_user_has_role('superadmin'));

alter policy "teacher_assignments_superadmin_update_all"
on public.teacher_assignments
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

alter policy "teacher_assignments_teacher_select_own"
on public.teacher_assignments
using (teacher_id = auth.uid());

drop trigger students_people_school_context on public.students;
drop trigger families_people_school_context on public.families;
drop trigger student_families_people_school_context on public.student_families;
drop trigger parent_students_people_school_context on public.parent_students;
drop trigger teachers_people_school_context on public.teachers;
drop trigger teacher_assignments_people_school_context
  on public.teacher_assignments;

drop function public.set_and_validate_people_school_context();
drop function public.user_has_active_school_role(
  uuid,
  uuid,
  public.app_role[]
);

alter table public.students
  drop constraint students_course_school_fkey,
  drop constraint students_academic_year_school_fkey,
  drop constraint students_school_id_fkey;

alter table public.student_families
  drop constraint student_families_student_school_fkey,
  drop constraint student_families_family_school_fkey,
  drop constraint student_families_school_id_fkey;

alter table public.parent_students
  drop constraint parent_students_student_school_fkey,
  drop constraint parent_students_school_id_fkey;

alter table public.teacher_assignments
  drop constraint teacher_assignments_course_school_fkey,
  drop constraint teacher_assignments_subject_school_fkey,
  drop constraint teacher_assignments_academic_year_school_fkey,
  drop constraint teacher_assignments_school_id_fkey;

alter table public.families
  drop constraint families_school_id_fkey;

alter table public.teachers
  drop constraint teachers_school_id_fkey;

alter table public.students
  add constraint students_course_id_fkey
  foreign key (course_id) references public.courses(id),
  add constraint students_academic_year_id_fkey
  foreign key (academic_year_id) references public.academic_years(id);

alter table public.student_families
  add constraint student_families_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade,
  add constraint student_families_family_id_fkey
  foreign key (family_id) references public.families(id) on delete cascade;

alter table public.parent_students
  add constraint parent_students_student_id_fkey
  foreign key (student_id) references public.students(id) on delete cascade;

alter table public.teacher_assignments
  add constraint teacher_assignments_course_id_fkey
  foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint teacher_assignments_subject_id_fkey
  foreign key (subject_id) references public.subjects(id) on delete cascade,
  add constraint teacher_assignments_academic_year_id_fkey
  foreign key (academic_year_id) references public.academic_years(id);

drop index public.students_id_school_id_uidx;
drop index public.families_id_school_id_uidx;
drop index public.teachers_id_school_id_uidx;
drop index public.parent_students_school_relation_uidx;
drop index public.teacher_assignments_school_relation_uidx;
drop index public.students_school_id_idx;
drop index public.families_school_id_idx;
drop index public.student_families_school_id_idx;
drop index public.parent_students_school_id_idx;
drop index public.teachers_school_id_idx;
drop index public.teacher_assignments_school_id_idx;

alter table public.students drop column school_id;
alter table public.families drop column school_id;
alter table public.student_families drop column school_id;
alter table public.parent_students drop column school_id;
alter table public.teachers drop column school_id;
alter table public.teacher_assignments drop column school_id;

do $rollback_postconditions$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'students',
        'families',
        'student_families',
        'parent_students',
        'teachers',
        'teacher_assignments'
      )
      and column_name = 'school_id'
  ) then
    raise exception 'Rollback 037 left a people school_id column.';
  end if;

  if exists (
    select 1
    from pg_trigger
    where tgname like '%_people_school_context'
      and not tgisinternal
  ) then
    raise exception 'Rollback 037 left a people context trigger.';
  end if;
end
$rollback_postconditions$;

commit;
