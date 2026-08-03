-- DO NOT APPLY
-- DESIGN ONLY
-- PRODUCTION ADOPTION
-- NOT A MIGRATION
--
-- Purpose: replace the staging-only 036 when rehearsing a restored production
-- clone. It adopts the existing academic configuration without fixtures.
--
-- People ownership is intentionally not written here. Migration 037 owns the
-- people columns, deterministic backfill, composite FKs and RLS. This file
-- proves that the retained student, parent relation and tutor assignments are
-- ready for 037. Adding those columns here would make 037 fail on duplicate
-- columns and is therefore explicitly forbidden.

begin;

do $preflight$
declare
  penafort_school_id constant uuid := '20f20000-0000-4000-8000-000000000001';
begin
  if (
    select count(*)
    from public.schools
    where id = penafort_school_id
      and slug = 'colegio-penafort'
      and active = true
      and status = 'active'
  ) <> 1 then
    raise exception '036-PROD requires the active Colegio Penafort tenant.';
  end if;

  if (select count(*) from public.schools) <> 1
     or (
       select count(*)
       from public.school_memberships
       where school_id = penafort_school_id
         and active = true
     ) <> 4 then
    raise exception '036-PROD requires one school and four active memberships.';
  end if;

  if (select count(*) from public.academic_years) <> 1
     or (select count(*) from public.courses) <> 12
     or (select count(*) from public.subjects) <> 18
     or (select count(*) from public.course_subjects) <> 102 then
    raise exception '036-PROD restore fingerprint differs from the audited production snapshot.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('academic_years', 'courses', 'subjects', 'course_subjects')
      and column_name = 'school_id'
  ) then
    raise exception '036-PROD found an existing configuration school_id.';
  end if;

  if to_regclass('public.academic_years_only_one_active_idx') is null
     or not exists (
       select 1 from pg_constraint
       where conrelid = 'public.academic_years'::regclass
         and conname = 'academic_years_name_key'
     )
     or not exists (
       select 1 from pg_constraint
       where conrelid = 'public.courses'::regclass
         and conname = 'courses_name_key'
     )
     or not exists (
       select 1 from pg_constraint
       where conrelid = 'public.subjects'::regclass
         and conname = 'subjects_name_key'
     ) then
    raise exception '036-PROD legacy uniqueness fingerprint is incomplete.';
  end if;

  if (select count(*) from public.academic_years where active) <> 1 then
    raise exception '036-PROD requires exactly one active academic year.';
  end if;

  if exists (
    select 1
    from public.courses course
    left join public.academic_years academic_year
      on academic_year.id = course.academic_year_id
    where academic_year.id is null
  ) then
    raise exception '036-PROD found a course without a valid academic year.';
  end if;

  if exists (
    select 1
    from public.course_subjects relation
    left join public.courses course on course.id = relation.course_id
    left join public.subjects subject on subject.id = relation.subject_id
    left join public.academic_years academic_year
      on academic_year.id = relation.academic_year_id
    where course.id is null
       or subject.id is null
       or academic_year.id is null
       or course.academic_year_id is distinct from relation.academic_year_id
  ) then
    raise exception '036-PROD found an incomplete configuration relation.';
  end if;

  if exists (
    select course_id, subject_id, academic_year_id
    from public.course_subjects
    group by course_id, subject_id, academic_year_id
    having count(*) > 1
  ) then
    raise exception '036-PROD found duplicate course-subject relations.';
  end if;

  -- Readiness contract for migration 037. No people rows are changed here.
  if (select count(*) from public.students) <> 1
     or (select count(*) from public.parent_students) <> 1
     or (select count(*) from public.teacher_assignments) <> 9
     or exists (select 1 from public.families)
     or exists (select 1 from public.student_families)
     or exists (select 1 from public.teachers) then
    raise exception '036-PROD people fingerprint differs from the audited snapshot.';
  end if;

  if exists (
    select 1
    from public.students student
    left join public.courses course on course.id = student.course_id
    left join public.academic_years academic_year
      on academic_year.id = student.academic_year_id
    left join public.profiles tutor on tutor.id = student.tutor_teacher_id
    left join public.school_memberships membership
      on membership.user_id = student.tutor_teacher_id
     and membership.school_id = penafort_school_id
     and membership.role = 'tutor'
     and membership.active = true
    where course.id is null
       or academic_year.id is null
       or course.academic_year_id is distinct from student.academic_year_id
       or tutor.id is null
       or tutor.role <> 'tutor'
       or tutor.active is not true
       or membership.id is null
  ) then
    raise exception '036-PROD student/tutor ownership is not deterministic.';
  end if;

  if exists (
    select 1
    from public.parent_students relation
    left join public.students student on student.id = relation.student_id
    left join public.profiles family on family.id = relation.parent_id
    left join public.school_memberships membership
      on membership.user_id = relation.parent_id
     and membership.school_id = penafort_school_id
     and membership.role = 'family'
     and membership.active = true
    where student.id is null
       or family.id is null
       or family.role <> 'family'
       or family.active is not true
       or membership.id is null
  ) then
    raise exception '036-PROD family/student ownership is not deterministic.';
  end if;

  if exists (
    select 1
    from public.teacher_assignments assignment
    left join public.profiles tutor on tutor.id = assignment.teacher_id
    left join public.courses course on course.id = assignment.course_id
    left join public.subjects subject on subject.id = assignment.subject_id
    left join public.academic_years academic_year
      on academic_year.id = assignment.academic_year_id
    left join public.course_subjects relation
      on relation.course_id = assignment.course_id
     and relation.subject_id = assignment.subject_id
     and relation.academic_year_id = assignment.academic_year_id
    left join public.school_memberships membership
      on membership.user_id = assignment.teacher_id
     and membership.school_id = penafort_school_id
     and membership.role = 'tutor'
     and membership.active = true
    where tutor.id is null
       or tutor.role <> 'tutor'
       or tutor.active is not true
       or course.id is null
       or subject.id is null
       or academic_year.id is null
       or relation.id is null
       or course.academic_year_id is distinct from assignment.academic_year_id
       or membership.id is null
  ) then
    raise exception '036-PROD tutor assignment ownership is not deterministic.';
  end if;
end
$preflight$;

alter table public.academic_years add column school_id uuid;
alter table public.courses add column school_id uuid;
alter table public.subjects add column school_id uuid;
alter table public.course_subjects add column school_id uuid;

alter table public.academic_years
  add constraint academic_years_school_id_fkey
  foreign key (school_id) references public.schools(id);
alter table public.courses
  add constraint courses_school_id_fkey
  foreign key (school_id) references public.schools(id);
alter table public.subjects
  add constraint subjects_school_id_fkey
  foreign key (school_id) references public.schools(id);
alter table public.course_subjects
  add constraint course_subjects_school_id_fkey
  foreign key (school_id) references public.schools(id);

update public.academic_years
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.courses
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.subjects
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.course_subjects relation
set school_id = course.school_id
from public.courses course
where course.id = relation.course_id
  and relation.school_id is null;

alter table public.academic_years alter column school_id set not null;
alter table public.courses alter column school_id set not null;
alter table public.subjects alter column school_id set not null;
alter table public.course_subjects alter column school_id set not null;

create index academic_years_school_id_idx on public.academic_years (school_id);
create index courses_school_id_idx on public.courses (school_id);
create index subjects_school_id_idx on public.subjects (school_id);
create index course_subjects_school_id_idx on public.course_subjects (school_id);

create unique index academic_years_id_school_id_uidx
  on public.academic_years (id, school_id);
create unique index courses_id_school_id_uidx
  on public.courses (id, school_id);
create unique index subjects_id_school_id_uidx
  on public.subjects (id, school_id);

create unique index academic_years_school_name_uidx
  on public.academic_years (school_id, name);
create unique index academic_years_one_active_per_school_uidx
  on public.academic_years (school_id)
  where active = true;
create unique index courses_school_year_name_uidx
  on public.courses (school_id, academic_year_id, name);
create unique index subjects_school_name_uidx
  on public.subjects (school_id, name);
create unique index course_subjects_school_unique_uidx
  on public.course_subjects (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    coalesce(track, '')
  );

-- Replace global uniqueness only after tenant-scoped equivalents exist.
drop index public.academic_years_only_one_active_idx;
alter table public.academic_years drop constraint academic_years_name_key;
alter table public.courses drop constraint courses_name_key;
alter table public.subjects drop constraint subjects_name_key;

alter table public.courses
  add constraint courses_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id);

alter table public.course_subjects
  add constraint course_subjects_course_school_fkey
  foreign key (course_id, school_id)
  references public.courses (id, school_id);
alter table public.course_subjects
  add constraint course_subjects_subject_school_fkey
  foreign key (subject_id, school_id)
  references public.subjects (id, school_id);
alter table public.course_subjects
  add constraint course_subjects_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id);

create or replace function public.active_academic_year_id(p_school_id uuid)
returns uuid
language sql
stable
set search_path = public
as $$
  select academic_year.id
  from public.academic_years academic_year
  where academic_year.school_id = p_school_id
    and academic_year.active = true
  order by academic_year.created_at desc
  limit 1
$$;

create or replace function public.active_academic_year_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select academic_year.id
  from public.academic_years academic_year
  where academic_year.active = true
  order by
    (academic_year.school_id = '20f20000-0000-4000-8000-000000000001') desc,
    academic_year.created_at desc
  limit 1
$$;

create or replace function public.set_default_course_configuration_context()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.school_id is null and new.academic_year_id is not null then
    select academic_year.school_id
    into new.school_id
    from public.academic_years academic_year
    where academic_year.id = new.academic_year_id;
  end if;

  if new.academic_year_id is null and new.school_id is not null then
    new.academic_year_id = public.active_academic_year_id(new.school_id);
  end if;

  if new.school_id is null or new.academic_year_id is null then
    raise exception 'Course requires a school and an active academic year.';
  end if;

  if not exists (
    select 1
    from public.academic_years academic_year
    where academic_year.id = new.academic_year_id
      and academic_year.school_id = new.school_id
  ) then
    raise exception 'Course academic year does not belong to its school.';
  end if;

  return new;
end;
$$;

drop trigger if exists courses_default_academic_year on public.courses;
create trigger courses_default_academic_year
before insert or update of school_id, academic_year_id on public.courses
for each row execute function public.set_default_course_configuration_context();

create or replace function public.is_active_school_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = auth.uid()
      and membership.school_id = p_school_id
      and membership.active = true
      and school.active = true
  )
$$;

create or replace function public.has_school_role(
  p_school_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = auth.uid()
      and membership.school_id = p_school_id
      and membership.role = any(p_roles)
      and membership.active = true
      and school.active = true
  )
$$;

create or replace function public.can_manage_school_configuration(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_user_has_role('superadmin')
    and exists (
      select 1
      from public.schools school
      where school.id = p_school_id
        and school.active = true
    )
$$;

revoke all on function public.is_active_school_member(uuid) from public;
revoke all on function public.has_school_role(uuid, public.app_role[]) from public;
revoke all on function public.can_manage_school_configuration(uuid) from public;
grant execute on function public.is_active_school_member(uuid) to authenticated;
grant execute on function public.has_school_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.can_manage_school_configuration(uuid) to authenticated;

alter policy "academic_years_superadmin_all"
on public.academic_years
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "academic_years_director_select"
on public.academic_years
using (public.has_school_role(school_id, array['director']::public.app_role[]));

alter policy "academic_years_active_select"
on public.academic_years
using (
  active = true
  and public.has_school_role(
    school_id,
    array['tutor', 'family']::public.app_role[]
  )
);

alter policy "courses_authenticated_select_all"
on public.courses
using (
  public.current_user_has_role('superadmin')
  or public.is_active_school_member(school_id)
);

alter policy "courses_director_select_all"
on public.courses
using (public.has_school_role(school_id, array['director']::public.app_role[]));

alter policy "courses_superadmin_insert_all"
on public.courses
with check (public.can_manage_school_configuration(school_id));

alter policy "courses_superadmin_update_all"
on public.courses
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "subjects_authenticated_select_all"
on public.subjects
using (
  public.current_user_has_role('superadmin')
  or public.is_active_school_member(school_id)
);

alter policy "subjects_superadmin_insert_all"
on public.subjects
with check (public.can_manage_school_configuration(school_id));

alter policy "subjects_superadmin_update_all"
on public.subjects
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "course_subjects_authenticated_select"
on public.course_subjects
using (
  public.current_user_has_role('superadmin')
  or public.is_active_school_member(school_id)
);

alter policy "course_subjects_superadmin_insert"
on public.course_subjects
with check (public.can_manage_school_configuration(school_id));

alter policy "course_subjects_superadmin_update"
on public.course_subjects
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "course_subjects_superadmin_delete"
on public.course_subjects
using (public.can_manage_school_configuration(school_id));

do $postflight$
declare
  penafort_school_id constant uuid := '20f20000-0000-4000-8000-000000000001';
begin
  if exists (select 1 from public.academic_years where school_id is null)
     or exists (select 1 from public.courses where school_id is null)
     or exists (select 1 from public.subjects where school_id is null)
     or exists (select 1 from public.course_subjects where school_id is null) then
    raise exception '036-PROD left configuration rows without a school.';
  end if;

  if exists (
    select 1
    from public.academic_years
    where school_id <> penafort_school_id
  ) or exists (
    select 1
    from public.courses
    where school_id <> penafort_school_id
  ) or exists (
    select 1
    from public.subjects
    where school_id <> penafort_school_id
  ) or exists (
    select 1
    from public.course_subjects
    where school_id <> penafort_school_id
  ) then
    raise exception '036-PROD assigned configuration to an unexpected school.';
  end if;

  if exists (
    select 1
    from public.courses course
    join public.academic_years academic_year
      on academic_year.id = course.academic_year_id
    where course.school_id is distinct from academic_year.school_id
  ) or exists (
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
    raise exception '036-PROD produced a cross-school configuration relation.';
  end if;

  if (select count(*) from public.academic_years) <> 1
     or (select count(*) from public.courses) <> 12
     or (select count(*) from public.subjects) <> 18
     or (select count(*) from public.course_subjects) <> 102
     or (select count(*) from public.students) <> 1
     or (select count(*) from public.parent_students) <> 1
     or (select count(*) from public.teacher_assignments) <> 9 then
    raise exception '036-PROD changed a protected row count.';
  end if;
end
$postflight$;

commit;

-- People backfill contract:
-- - 037 adds school_id to students, families, student_families,
--   parent_students, teachers and teacher_assignments.
-- - 037 derives student ownership from course/year, family ownership from the
--   student relation and tutor ownership from assignments plus active
--   memberships. It rejects ambiguity instead of selecting the first school.
-- - The empty legacy families/teachers tables remain empty.
--
-- Rollback rule for the future rehearsal:
-- 1. Any failure before COMMIT rolls back every statement above.
-- 2. After COMMIT, restore the isolated clone snapshot. Reconstructing the
--    dropped global uniqueness objects in place is not an approved rollback.
