-- STAGING ONLY - CONTROLLED REHEARSAL - SPRINT 20.2E
-- Never apply this file to production without a separate approval sprint.
-- People wave after 036.
--
-- This draft never chooses a school from profile_id, email, profiles.role or
-- the first membership. Row ownership comes from an academic root. A related
-- Auth identity is accepted only when it has the required active membership
-- in that exact school.

begin;

do $preconditions$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'academic_years',
        'courses',
        'subjects',
        'course_subjects'
      )
      and column_name = 'school_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) <> 4 then
    raise exception 'Migration 037 requires the tenant-aware configuration from 036.';
  end if;

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
    raise exception 'Refusing 037: a people school_id column already exists.';
  end if;

  if (
    select count(*)
    from pg_constraint
    where conname in (
      'students_course_id_fkey',
      'students_academic_year_id_fkey',
      'student_families_student_id_fkey',
      'student_families_family_id_fkey',
      'parent_students_student_id_fkey',
      'teacher_assignments_course_id_fkey',
      'teacher_assignments_subject_id_fkey',
      'teacher_assignments_academic_year_id_fkey'
    )
  ) <> 8 then
    raise exception 'Refusing 037: a replaceable people foreign key is missing.';
  end if;

  if exists (
    select 1
    from public.profiles profile
    left join auth.users auth_user on auth_user.id = profile.id
    where auth_user.id is null
  ) then
    raise exception 'Refusing 037: a profile has no Auth user.';
  end if;

  if exists (
    select 1
    from public.students student
    left join public.courses course on course.id = student.course_id
    left join public.academic_years academic_year
      on academic_year.id = student.academic_year_id
    where student.course_id is null
       or course.id is null
       or academic_year.id is null
       or course.school_id is distinct from academic_year.school_id
       or course.academic_year_id is distinct from student.academic_year_id
  ) then
    raise exception 'Refusing 037: a student has no deterministic course/year school.';
  end if;

  if exists (
    select 1
    from public.students student
    join public.courses course on course.id = student.course_id
    left join public.profiles tutor_profile
      on tutor_profile.id = student.tutor_teacher_id
    left join public.school_memberships membership
      on membership.user_id = student.tutor_teacher_id
     and membership.school_id = course.school_id
     and membership.role = 'tutor'
     and membership.active = true
    where student.tutor_teacher_id is not null
      and (
        tutor_profile.id is null
        or tutor_profile.active is not true
        or membership.id is null
      )
  ) then
    raise exception 'Refusing 037: a student tutor lacks an active tutor membership in the course school.';
  end if;

  if exists (
    select 1
    from public.parent_students relation
    left join public.students student on student.id = relation.student_id
    left join public.courses course on course.id = student.course_id
    left join public.profiles parent_profile
      on parent_profile.id = relation.parent_id
    left join public.school_memberships membership
      on membership.user_id = relation.parent_id
     and membership.school_id = course.school_id
     and membership.role = 'family'
     and membership.active = true
    where relation.parent_id is null
       or relation.student_id is null
       or student.id is null
       or course.id is null
       or parent_profile.id is null
       or parent_profile.active is not true
       or membership.id is null
  ) then
    raise exception 'Refusing 037: a parent-student relation has no active family membership in the student school.';
  end if;

  if exists (
    select parent_id, student_id
    from public.parent_students
    group by parent_id, student_id
    having count(*) > 1
  ) then
    raise exception 'Refusing 037: duplicate parent-student relations exist.';
  end if;

  if exists (
    select 1
    from public.teacher_assignments assignment
    left join public.courses course on course.id = assignment.course_id
    left join public.subjects subject on subject.id = assignment.subject_id
    left join public.academic_years academic_year
      on academic_year.id = assignment.academic_year_id
    left join public.profiles teacher_profile
      on teacher_profile.id = assignment.teacher_id
    left join public.school_memberships membership
      on membership.user_id = assignment.teacher_id
     and membership.school_id = course.school_id
     and membership.role = 'tutor'
     and membership.active = true
    where assignment.teacher_id is null
       or assignment.course_id is null
       or assignment.subject_id is null
       or course.id is null
       or subject.id is null
       or academic_year.id is null
       or course.school_id is distinct from subject.school_id
       or course.school_id is distinct from academic_year.school_id
       or course.academic_year_id is distinct from assignment.academic_year_id
       or teacher_profile.id is null
       or teacher_profile.active is not true
       or membership.id is null
  ) then
    raise exception 'Refusing 037: a teacher assignment has an incomplete, cross-school or unauthorized context.';
  end if;

  if exists (
    select teacher_id, course_id, subject_id, academic_year_id
    from public.teacher_assignments
    group by teacher_id, course_id, subject_id, academic_year_id
    having count(*) > 1
  ) then
    raise exception 'Refusing 037: duplicate teacher assignments exist.';
  end if;

  -- The legacy teachers table has no declared or reliable relationship to
  -- profiles/Auth. Email equality is not ownership evidence.
  if exists (select 1 from public.teachers) then
    raise exception 'Refusing 037: legacy teachers require an audited tenant mapping or deprecation.';
  end if;

  if exists (
    select 1
    from public.families family
    left join public.student_families relation
      on relation.family_id = family.id
    where relation.family_id is null
  ) then
    raise exception 'Refusing 037: a legacy family has no student relationship from which to derive a school.';
  end if;

  if exists (
    select relation.family_id
    from public.student_families relation
    join public.students student on student.id = relation.student_id
    join public.courses course on course.id = student.course_id
    group by relation.family_id
    having count(distinct course.school_id) <> 1
  ) then
    raise exception 'Refusing 037: a legacy family is linked to zero or multiple schools.';
  end if;

  if exists (
    select 1
    from public.student_families relation
    left join public.students student on student.id = relation.student_id
    left join public.families family on family.id = relation.family_id
    where student.id is null or family.id is null
  ) then
    raise exception 'Refusing 037: an orphan legacy student-family relation exists.';
  end if;
end
$preconditions$;

alter table public.students add column school_id uuid;
alter table public.families add column school_id uuid;
alter table public.student_families add column school_id uuid;
alter table public.parent_students add column school_id uuid;
alter table public.teachers add column school_id uuid;
alter table public.teacher_assignments add column school_id uuid;

alter table public.students
  add constraint students_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete restrict;
alter table public.families
  add constraint families_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete restrict;
alter table public.student_families
  add constraint student_families_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete restrict;
alter table public.parent_students
  add constraint parent_students_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete restrict;
alter table public.teachers
  add constraint teachers_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete restrict;
alter table public.teacher_assignments
  add constraint teacher_assignments_school_id_fkey
  foreign key (school_id) references public.schools(id) on delete restrict;

update public.students student
set school_id = course.school_id
from public.courses course
where course.id = student.course_id;

with family_candidates as (
  select distinct
    relation.family_id,
    student.school_id
  from public.student_families relation
  join public.students student on student.id = relation.student_id
)
update public.families family
set school_id = candidate.school_id
from family_candidates candidate
where candidate.family_id = family.id;

update public.student_families relation
set school_id = student.school_id
from public.students student
where student.id = relation.student_id;

update public.parent_students relation
set school_id = student.school_id
from public.students student
where student.id = relation.student_id;

update public.teacher_assignments assignment
set school_id = course.school_id
from public.courses course
where course.id = assignment.course_id;

do $backfill_postconditions$
begin
  if exists (select 1 from public.students where school_id is null)
     or exists (select 1 from public.families where school_id is null)
     or exists (select 1 from public.student_families where school_id is null)
     or exists (select 1 from public.parent_students where school_id is null)
     or exists (select 1 from public.teachers where school_id is null)
     or exists (select 1 from public.teacher_assignments where school_id is null) then
    raise exception 'Migration 037 left a people row without a deterministic school.';
  end if;

  if exists (
    select 1
    from public.students student
    join public.courses course on course.id = student.course_id
    join public.academic_years academic_year
      on academic_year.id = student.academic_year_id
    where student.school_id is distinct from course.school_id
       or student.school_id is distinct from academic_year.school_id
  ) then
    raise exception 'Migration 037 produced a cross-school student context.';
  end if;

  if exists (
    select 1
    from public.student_families relation
    join public.students student on student.id = relation.student_id
    join public.families family on family.id = relation.family_id
    where relation.school_id is distinct from student.school_id
       or relation.school_id is distinct from family.school_id
  ) then
    raise exception 'Migration 037 produced a cross-school legacy family relation.';
  end if;

  if exists (
    select 1
    from public.parent_students relation
    join public.students student on student.id = relation.student_id
    where relation.school_id is distinct from student.school_id
  ) then
    raise exception 'Migration 037 produced a cross-school parent relation.';
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
    raise exception 'Migration 037 produced a cross-school teacher assignment.';
  end if;
end
$backfill_postconditions$;

create unique index students_id_school_id_uidx
  on public.students (id, school_id);
create unique index families_id_school_id_uidx
  on public.families (id, school_id);
create unique index teachers_id_school_id_uidx
  on public.teachers (id, school_id);

create unique index parent_students_school_relation_uidx
  on public.parent_students (school_id, parent_id, student_id);
create unique index teacher_assignments_school_relation_uidx
  on public.teacher_assignments (
    school_id,
    teacher_id,
    course_id,
    subject_id,
    academic_year_id
  );

create index students_school_id_idx
  on public.students (school_id);
create index families_school_id_idx
  on public.families (school_id);
create index student_families_school_id_idx
  on public.student_families (school_id);
create index parent_students_school_id_idx
  on public.parent_students (school_id);
create index teachers_school_id_idx
  on public.teachers (school_id);
create index teacher_assignments_school_id_idx
  on public.teacher_assignments (school_id);

-- Replace the legacy single-column relationships. Keeping both definitions
-- makes PostgREST embedding ambiguous even though both constraints are valid.
alter table public.students
  drop constraint students_course_id_fkey,
  drop constraint students_academic_year_id_fkey;

alter table public.student_families
  drop constraint student_families_student_id_fkey,
  drop constraint student_families_family_id_fkey;

alter table public.parent_students
  drop constraint parent_students_student_id_fkey;

alter table public.teacher_assignments
  drop constraint teacher_assignments_course_id_fkey,
  drop constraint teacher_assignments_subject_id_fkey,
  drop constraint teacher_assignments_academic_year_id_fkey;

alter table public.students
  add constraint students_course_school_fkey
  foreign key (course_id, school_id)
  references public.courses (id, school_id);
alter table public.students
  add constraint students_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id);

alter table public.student_families
  add constraint student_families_student_school_fkey
  foreign key (student_id, school_id)
  references public.students (id, school_id);
alter table public.student_families
  add constraint student_families_family_school_fkey
  foreign key (family_id, school_id)
  references public.families (id, school_id);

alter table public.parent_students
  add constraint parent_students_student_school_fkey
  foreign key (student_id, school_id)
  references public.students (id, school_id);

alter table public.teacher_assignments
  add constraint teacher_assignments_course_school_fkey
  foreign key (course_id, school_id)
  references public.courses (id, school_id);
alter table public.teacher_assignments
  add constraint teacher_assignments_subject_school_fkey
  foreign key (subject_id, school_id)
  references public.subjects (id, school_id);
alter table public.teacher_assignments
  add constraint teacher_assignments_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id);

create or replace function public.user_has_active_school_role(
  p_user_id uuid,
  p_school_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    join public.profiles profile on profile.id = membership.user_id
    where membership.user_id = p_user_id
      and membership.school_id = p_school_id
      and membership.role = any(p_roles)
      and membership.active = true
      and school.active = true
      and profile.active = true
  )
$$;

revoke all on function public.user_has_active_school_role(
  uuid,
  uuid,
  public.app_role[]
) from public;

create or replace function public.set_and_validate_people_school_context()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  derived_school_id uuid;
begin
  case tg_table_name
    when 'students' then
      if new.course_id is null or new.academic_year_id is null then
        raise exception 'Student requires course and academic year.'
          using errcode = '23514';
      end if;

      select course.school_id
      into derived_school_id
      from public.courses course
      join public.academic_years academic_year
        on academic_year.id = new.academic_year_id
       and academic_year.school_id = course.school_id
      where course.id = new.course_id
        and course.academic_year_id = new.academic_year_id;

      if derived_school_id is null then
        raise exception 'Student course and academic year do not share a school.'
          using errcode = '23514';
      end if;

      if new.school_id is not null
         and new.school_id is distinct from derived_school_id then
        raise exception 'Student school does not match its academic context.'
          using errcode = '23514';
      end if;

      new.school_id := derived_school_id;

      if new.tutor_teacher_id is not null
         and not public.user_has_active_school_role(
           new.tutor_teacher_id,
           new.school_id,
           array['tutor']::public.app_role[]
         ) then
        raise exception 'Student tutor has no active tutor membership in the student school.'
          using errcode = '23514';
      end if;

    when 'families' then
      if new.school_id is null then
        raise exception 'Legacy family writes require an explicit audited school.'
          using errcode = '23514';
      end if;

    when 'teachers' then
      if new.school_id is null then
        raise exception 'Legacy teacher writes require an explicit audited school.'
          using errcode = '23514';
      end if;

    when 'student_families' then
      if new.student_id is null or new.family_id is null then
        raise exception 'Legacy family relation requires student and family.'
          using errcode = '23514';
      end if;

      select student.school_id
      into derived_school_id
      from public.students student
      join public.families family
        on family.id = new.family_id
       and family.school_id = student.school_id
      where student.id = new.student_id;

      if derived_school_id is null then
        raise exception 'Legacy family and student do not share a school.'
          using errcode = '23514';
      end if;

      if new.school_id is not null
         and new.school_id is distinct from derived_school_id then
        raise exception 'Legacy student-family school does not match its entities.'
          using errcode = '23514';
      end if;

      new.school_id := derived_school_id;

    when 'parent_students' then
      if new.parent_id is null or new.student_id is null then
        raise exception 'Parent relation requires parent and student.'
          using errcode = '23514';
      end if;

      select student.school_id
      into derived_school_id
      from public.students student
      where student.id = new.student_id;

      if derived_school_id is null then
        raise exception 'Parent relation student has no school.'
          using errcode = '23514';
      end if;

      if new.school_id is not null
         and new.school_id is distinct from derived_school_id then
        raise exception 'Parent relation school does not match its student.'
          using errcode = '23514';
      end if;

      new.school_id := derived_school_id;

      if not public.user_has_active_school_role(
        new.parent_id,
        new.school_id,
        array['family']::public.app_role[]
      ) then
        raise exception 'Parent has no active family membership in the student school.'
          using errcode = '23514';
      end if;

    when 'teacher_assignments' then
      if new.teacher_id is null
         or new.course_id is null
         or new.subject_id is null
         or new.academic_year_id is null then
        raise exception 'Teacher assignment requires teacher, course, subject and academic year.'
          using errcode = '23514';
      end if;

      select course.school_id
      into derived_school_id
      from public.courses course
      join public.subjects subject
        on subject.id = new.subject_id
       and subject.school_id = course.school_id
      join public.academic_years academic_year
        on academic_year.id = new.academic_year_id
       and academic_year.school_id = course.school_id
      where course.id = new.course_id
        and course.academic_year_id = new.academic_year_id;

      if derived_school_id is null then
        raise exception 'Teacher assignment academic roots do not share a school.'
          using errcode = '23514';
      end if;

      if new.school_id is not null
         and new.school_id is distinct from derived_school_id then
        raise exception 'Teacher assignment school does not match its academic roots.'
          using errcode = '23514';
      end if;

      new.school_id := derived_school_id;

      if not public.user_has_active_school_role(
        new.teacher_id,
        new.school_id,
        array['tutor']::public.app_role[]
      ) then
        raise exception 'Teacher has no active tutor membership in the assignment school.'
          using errcode = '23514';
      end if;

    else
      raise exception 'Unsupported people context table: %.', tg_table_name;
  end case;

  if not exists (
    select 1
    from public.schools school
    where school.id = new.school_id
      and school.active = true
  ) then
    raise exception 'People rows require an active school.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.set_and_validate_people_school_context()
from public;

create trigger students_people_school_context
before insert or update of course_id, academic_year_id, tutor_teacher_id, school_id
on public.students
for each row execute function public.set_and_validate_people_school_context();

create trigger families_people_school_context
before insert or update of school_id
on public.families
for each row execute function public.set_and_validate_people_school_context();

create trigger student_families_people_school_context
before insert or update of student_id, family_id, school_id
on public.student_families
for each row execute function public.set_and_validate_people_school_context();

create trigger parent_students_people_school_context
before insert or update of parent_id, student_id, school_id
on public.parent_students
for each row execute function public.set_and_validate_people_school_context();

create trigger teachers_people_school_context
before insert or update of school_id
on public.teachers
for each row execute function public.set_and_validate_people_school_context();

create trigger teacher_assignments_people_school_context
before insert or update of teacher_id, course_id, subject_id, academic_year_id, school_id
on public.teacher_assignments
for each row execute function public.set_and_validate_people_school_context();

alter table public.students alter column school_id set not null;
alter table public.families alter column school_id set not null;
alter table public.student_families alter column school_id set not null;
alter table public.parent_students alter column school_id set not null;
alter table public.teachers alter column school_id set not null;
alter table public.teacher_assignments alter column school_id set not null;

-- Preserve existing functional permissions while adding the tenant boundary.
alter policy "students_director_can_read_all_students"
on public.students
using (
  public.has_school_role(
    school_id,
    array['director']::public.app_role[]
  )
);

alter policy "students_superadmin_insert_all"
on public.students
with check (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "students_superadmin_select_all"
on public.students
using (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "students_superadmin_update_all"
on public.students
using (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
)
with check (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "students_tutor_can_read_assigned_students"
on public.students
using (
  tutor_teacher_id = auth.uid()
  and public.has_school_role(
    school_id,
    array['tutor']::public.app_role[]
  )
);

alter policy "parent_students_family_select_own"
on public.parent_students
using (
  parent_id = auth.uid()
  and public.has_school_role(
    school_id,
    array['family']::public.app_role[]
  )
);

alter policy "parent_students_superadmin_delete_all"
on public.parent_students
using (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "parent_students_superadmin_insert_all"
on public.parent_students
with check (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "parent_students_superadmin_select_all"
on public.parent_students
using (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "teacher_assignments_superadmin_insert_all"
on public.teacher_assignments
with check (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "teacher_assignments_superadmin_select_all"
on public.teacher_assignments
using (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "teacher_assignments_superadmin_update_all"
on public.teacher_assignments
using (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
)
with check (
  public.has_school_role(
    school_id,
    array['superadmin']::public.app_role[]
  )
);

alter policy "teacher_assignments_teacher_select_own"
on public.teacher_assignments
using (
  teacher_id = auth.uid()
  and public.has_school_role(
    school_id,
    array['tutor']::public.app_role[]
  )
);

-- families, student_families and teachers stay closed to authenticated users.
-- They are legacy tables with RLS enabled and no policies.

do $final_postconditions$
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
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) <> 6 then
    raise exception 'Migration 037 did not require every people school_id.';
  end if;

  if (
    select count(*)
    from pg_trigger
    where tgname in (
      'students_people_school_context',
      'families_people_school_context',
      'student_families_people_school_context',
      'parent_students_people_school_context',
      'teachers_people_school_context',
      'teacher_assignments_people_school_context'
    )
      and not tgisinternal
  ) <> 6 then
    raise exception 'Migration 037 is missing a people context trigger.';
  end if;

  if exists (
    select 1
    from public.students student
    left join public.school_memberships membership
      on membership.user_id = student.tutor_teacher_id
     and membership.school_id = student.school_id
     and membership.role = 'tutor'
     and membership.active = true
    where student.tutor_teacher_id is not null
      and membership.id is null
  ) or exists (
    select 1
    from public.parent_students relation
    left join public.school_memberships membership
      on membership.user_id = relation.parent_id
     and membership.school_id = relation.school_id
     and membership.role = 'family'
     and membership.active = true
    where membership.id is null
  ) or exists (
    select 1
    from public.teacher_assignments assignment
    left join public.school_memberships membership
      on membership.user_id = assignment.teacher_id
     and membership.school_id = assignment.school_id
     and membership.role = 'tutor'
     and membership.active = true
    where membership.id is null
  ) then
    raise exception 'Migration 037 left a people relation without its required membership.';
  end if;
end
$final_postconditions$;

commit;

-- Operational rollback after a future staging rehearsal:
-- keep columns and constraints, restore the previous policies, and stop using
-- tenant-aware writes. A destructive rollback is not permitted.
