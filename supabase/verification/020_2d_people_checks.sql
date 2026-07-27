-- Sprint 20.2D verification design for migration 037.
-- DO NOT RUN before 037 is explicitly promoted and applied in a later sprint.
-- Every section, including read-only catalog checks, is bounded by
-- BEGIN/ROLLBACK. All identifiers and rows below are synthetic QA fixtures.

begin;
do $catalog_checks$
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
    raise exception 'A people table lacks a required school_id.';
  end if;

  if (
    select count(*)
    from pg_constraint
    where conname in (
      'students_school_id_fkey',
      'families_school_id_fkey',
      'student_families_school_id_fkey',
      'parent_students_school_id_fkey',
      'teachers_school_id_fkey',
      'teacher_assignments_school_id_fkey',
      'students_course_school_fkey',
      'students_academic_year_school_fkey',
      'student_families_student_school_fkey',
      'student_families_family_school_fkey',
      'parent_students_student_school_fkey',
      'teacher_assignments_course_school_fkey',
      'teacher_assignments_subject_school_fkey',
      'teacher_assignments_academic_year_school_fkey'
    )
  ) <> 14 then
    raise exception 'A people ownership constraint is missing.';
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
    raise exception 'A people context trigger is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'public.user_has_active_school_role(uuid,uuid,public.app_role[])'::regprocedure
      and prosecdef = true
  ) then
    raise exception 'The membership integrity helper is missing or not protected.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('students', 'parent_students', 'teacher_assignments')
      and (
        coalesce(qual, '') = 'true'
        or coalesce(with_check, '') = 'true'
      )
  ) then
    raise exception 'A people policy still grants unscoped access.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('families', 'student_families', 'teachers')
  ) then
    raise exception 'A legacy people table was opened to authenticated users.';
  end if;
end
$catalog_checks$;
rollback;

-- The selection algorithm must distinguish no source, one source and multiple
-- sources. It never orders or limits memberships to select a first school.
begin;
create temporary table people_resolution_candidates (
  entity_id uuid not null,
  school_id uuid not null
) on commit drop;

insert into people_resolution_candidates (entity_id, school_id)
values
  (
    '20d00000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000001'
  ),
  (
    '20d00000-0000-4000-8000-000000000002',
    '20e10000-0000-4000-8000-000000000001'
  ),
  (
    '20d00000-0000-4000-8000-000000000002',
    '20f20000-0000-4000-8000-000000000001'
  );

do $ambiguity_checks$
declare
  unique_sources integer;
  ambiguous_sources integer;
  missing_sources integer;
begin
  select count(*)
  into unique_sources
  from (
    select entity_id
    from people_resolution_candidates
    group by entity_id
    having count(distinct school_id) = 1
  ) resolved;

  select count(*)
  into ambiguous_sources
  from (
    select entity_id
    from people_resolution_candidates
    group by entity_id
    having count(distinct school_id) > 1
  ) ambiguous;

  select count(*)
  into missing_sources
  from (
    values ('20d00000-0000-4000-8000-000000000003'::uuid)
  ) expected(entity_id)
  left join people_resolution_candidates candidate
    on candidate.entity_id = expected.entity_id
  where candidate.entity_id is null;

  if unique_sources <> 1
     or ambiguous_sources <> 1
     or missing_sources <> 1 then
    raise exception 'Deterministic source classification failed.';
  end if;
end
$ambiguity_checks$;
rollback;

-- Superadmin can supervise and write only in schools with its explicit role.
begin;
insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  active
)
values
  (
    '20d20000-0000-4000-8000-000000000101',
    'Student',
    'QA School',
    '20e20000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20e20000-0000-4000-8000-000000000001',
    true
  ),
  (
    '20d30000-0000-4000-8000-000000000101',
    'Student',
    'QA Penafort',
    '20f30000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20f30000-0000-4000-8000-000000000001',
    true
  );

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000101',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $superadmin_rls_checks$
begin
  if (select count(*) from public.students) <> 2 then
    raise exception 'Superadmin cannot supervise both explicitly authorized schools.';
  end if;

  insert into public.students (
    id,
    name,
    last_name,
    course_id,
    tutor_teacher_id,
    academic_year_id,
    active
  )
  values (
    '20d20000-0000-4000-8000-000000000102',
    'Student',
    'Superadmin Insert',
    '20e20000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20e20000-0000-4000-8000-000000000001',
    true
  );
end
$superadmin_rls_checks$;
rollback;

-- Director reads students only through a director membership in the row school.
begin;
insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  active
)
values
  (
    '20d20000-0000-4000-8000-000000000111',
    'Student',
    'QA School',
    '20e20000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20e20000-0000-4000-8000-000000000001',
    true
  ),
  (
    '20d30000-0000-4000-8000-000000000111',
    'Student',
    'QA Penafort',
    '20f30000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20f30000-0000-4000-8000-000000000001',
    true
  );

update public.school_memberships
set active = false
where user_id = '20e10000-0000-4000-8000-000000000102'
  and school_id = '20f20000-0000-4000-8000-000000000001'
  and role = 'director';

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000102',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $director_rls_checks$
begin
  if (select count(*) from public.students) <> 1
     or exists (
       select 1
       from public.students
       where school_id <> '20e10000-0000-4000-8000-000000000001'
     ) then
    raise exception 'Director people isolation failed.';
  end if;

  if exists (select 1 from public.teacher_assignments) then
    raise exception 'Director unexpectedly gained teacher assignment access.';
  end if;
end
$director_rls_checks$;
rollback;

-- A multischool tutor receives each row school from course/year, never from
-- the first membership.
begin;
insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  active
)
values
  (
    '20d20000-0000-4000-8000-000000000121',
    'Student',
    'QA School',
    '20e20000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20e20000-0000-4000-8000-000000000001',
    true
  ),
  (
    '20d30000-0000-4000-8000-000000000121',
    'Student',
    'QA Penafort',
    '20f30000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000103',
    '20f30000-0000-4000-8000-000000000001',
    true
  );

insert into public.teacher_assignments (
  id,
  teacher_id,
  subject_id,
  course_id,
  academic_year_id
)
values
  (
    '20d20000-0000-4000-8000-000000000201',
    '20e10000-0000-4000-8000-000000000103',
    '20e20000-0000-4000-8000-000000000201',
    '20e20000-0000-4000-8000-000000000101',
    '20e20000-0000-4000-8000-000000000001'
  ),
  (
    '20d30000-0000-4000-8000-000000000201',
    '20e10000-0000-4000-8000-000000000103',
    '20f30000-0000-4000-8000-000000000201',
    '20f30000-0000-4000-8000-000000000101',
    '20f30000-0000-4000-8000-000000000001'
  );

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $tutor_rls_checks$
begin
  if (select count(*) from public.students) <> 2
     or (select count(*) from public.teacher_assignments) <> 2 then
    raise exception 'Multischool tutor resolution or RLS failed.';
  end if;
end
$tutor_rls_checks$;
rollback;

-- Family sees only its own relations and never gains teacher access.
begin;
insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  active
)
values (
  '20d20000-0000-4000-8000-000000000131',
  'Student',
  'Family Relation',
  '20e20000-0000-4000-8000-000000000101',
  '20e10000-0000-4000-8000-000000000103',
  '20e20000-0000-4000-8000-000000000001',
  true
);

insert into public.parent_students (
  id,
  parent_id,
  student_id
)
values (
  '20d20000-0000-4000-8000-000000000301',
  '20e10000-0000-4000-8000-000000000104',
  '20d20000-0000-4000-8000-000000000131'
);

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000104',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $family_rls_checks$
begin
  if (select count(*) from public.parent_students) <> 1 then
    raise exception 'Family cannot read its own student relation.';
  end if;

  if exists (select 1 from public.teacher_assignments)
     or exists (select 1 from public.families)
     or exists (select 1 from public.student_families)
     or exists (select 1 from public.teachers) then
    raise exception 'Family gained access to a staff or legacy people table.';
  end if;
end
$family_rls_checks$;
rollback;

-- Inactive and absent memberships grant no people access.
begin;
insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  active
)
values (
  '20d20000-0000-4000-8000-000000000141',
  'Student',
  'Inactive Membership',
  '20e20000-0000-4000-8000-000000000101',
  '20e10000-0000-4000-8000-000000000103',
  '20e20000-0000-4000-8000-000000000001',
  true
);

insert into public.parent_students (
  id,
  parent_id,
  student_id
)
values (
  '20d20000-0000-4000-8000-000000000341',
  '20e10000-0000-4000-8000-000000000104',
  '20d20000-0000-4000-8000-000000000141'
);

update public.school_memberships
set active = false
where user_id = '20e10000-0000-4000-8000-000000000104'
  and active = true;

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000104',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $inactive_membership_rls_checks$
begin
  if exists (select 1 from public.parent_students) then
    raise exception 'An inactive membership grants people access.';
  end if;
end
$inactive_membership_rls_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000105',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $no_membership_rls_checks$
begin
  if exists (select 1 from public.students)
     or exists (select 1 from public.parent_students)
     or exists (select 1 from public.teacher_assignments) then
    raise exception 'A user without membership can read people data.';
  end if;
end
$no_membership_rls_checks$;
rollback;

-- Negative integrity checks: all attempts are synthetic and rolled back.
begin;
insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  active
)
values (
  '20d20000-0000-4000-8000-000000000151',
  'Student',
  'Integrity',
  '20e20000-0000-4000-8000-000000000101',
  '20e10000-0000-4000-8000-000000000103',
  '20e20000-0000-4000-8000-000000000001',
  true
);

do $negative_integrity_checks$
begin
  begin
    insert into public.students (
      id,
      school_id,
      name,
      last_name,
      course_id,
      tutor_teacher_id,
      academic_year_id,
      active
    )
    values (
      '20d20000-0000-4000-8000-000000000152',
      '20f20000-0000-4000-8000-000000000001',
      'Student',
      'Cross School',
      '20e20000-0000-4000-8000-000000000101',
      '20e10000-0000-4000-8000-000000000103',
      '20e20000-0000-4000-8000-000000000001',
      true
    );
    raise exception 'A student accepted a client-supplied cross-school value.';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.students (
      id,
      name,
      last_name,
      course_id,
      tutor_teacher_id,
      academic_year_id,
      active
    )
    values (
      '20d20000-0000-4000-8000-000000000153',
      'Student',
      'Wrong Tutor',
      '20e20000-0000-4000-8000-000000000101',
      '20e10000-0000-4000-8000-000000000105',
      '20e20000-0000-4000-8000-000000000001',
      true
    );
    raise exception 'A student accepted a tutor without membership.';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.parent_students (
      id,
      parent_id,
      student_id
    )
    values (
      '20d20000-0000-4000-8000-000000000351',
      '20e10000-0000-4000-8000-000000000105',
      '20d20000-0000-4000-8000-000000000151'
    );
    raise exception 'A parent relation accepted a user without family membership.';
  exception
    when check_violation then null;
  end;

  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      course_id,
      subject_id,
      academic_year_id
    )
    values (
      '20d20000-0000-4000-8000-000000000251',
      '20e10000-0000-4000-8000-000000000103',
      '20e20000-0000-4000-8000-000000000101',
      '20f30000-0000-4000-8000-000000000201',
      '20e20000-0000-4000-8000-000000000001'
    );
    raise exception 'A teacher assignment accepted a cross-school subject.';
  exception
    when check_violation or foreign_key_violation then null;
  end;

  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      course_id,
      subject_id,
      academic_year_id
    )
    values (
      '20d20000-0000-4000-8000-000000000252',
      '20e10000-0000-4000-8000-000000000104',
      '20e20000-0000-4000-8000-000000000101',
      '20e20000-0000-4000-8000-000000000201',
      '20e20000-0000-4000-8000-000000000001'
    );
    raise exception 'A family role was accepted as a teacher assignment.';
  exception
    when check_violation then null;
  end;

  insert into public.families (
    id,
    school_id,
    name
  )
  values (
    '20d20000-0000-4000-8000-000000000401',
    '20e10000-0000-4000-8000-000000000001',
    'Legacy QA Family'
  );

  begin
    insert into public.student_families (
      student_id,
      family_id,
      school_id,
      relation
    )
    values (
      '20d20000-0000-4000-8000-000000000151',
      '20d20000-0000-4000-8000-000000000401',
      '20f20000-0000-4000-8000-000000000001',
      'qa'
    );
    raise exception 'A legacy family relation accepted a cross-school value.';
  exception
    when check_violation or foreign_key_violation then null;
  end;
end
$negative_integrity_checks$;
rollback;

begin;
do $final_counts$
begin
  if exists (select 1 from public.students)
     or exists (select 1 from public.families)
     or exists (select 1 from public.student_families)
     or exists (select 1 from public.parent_students)
     or exists (select 1 from public.teachers)
     or exists (select 1 from public.teacher_assignments) then
    raise exception 'People verification left persistent QA rows.';
  end if;
end
$final_counts$;
rollback;
