-- Sprint 20.2C checks for tenant-aware academic configuration.
-- Run only in staging after migration 036.
-- All behavioral writes are transactional and rolled back.

do $catalog_checks$
declare
  configuration_table text;
begin
  foreach configuration_table in array array[
    'academic_years',
    'courses',
    'subjects',
    'course_subjects'
  ]
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = configuration_table
        and column_name = 'school_id'
        and is_nullable = 'NO'
        and data_type = 'uuid'
    ) then
      raise exception 'Configuration table % lacks a required school_id.',
        configuration_table;
    end if;
  end loop;

  if to_regclass('public.academic_years_only_one_active_idx') is not null then
    raise exception 'The global active-year index still exists.';
  end if;

  if exists (
    select 1
    from pg_constraint
    where (
      conrelid = 'public.academic_years'::regclass
      and conname = 'academic_years_name_key'
    ) or (
      conrelid = 'public.courses'::regclass
      and conname = 'courses_name_key'
    ) or (
      conrelid = 'public.subjects'::regclass
      and conname = 'subjects_name_key'
    )
  ) then
    raise exception 'A global configuration name constraint still exists.';
  end if;

  if to_regclass('public.academic_years_one_active_per_school_uidx') is null
     or to_regclass('public.academic_years_school_name_uidx') is null
     or to_regclass('public.courses_school_year_name_uidx') is null
     or to_regclass('public.subjects_school_name_uidx') is null
     or to_regclass('public.course_subjects_school_unique_uidx') is null then
    raise exception 'A tenant-scoped uniqueness index is missing.';
  end if;

  if (
    select count(*)
    from pg_constraint
    where conname in (
      'academic_years_school_id_fkey',
      'courses_school_id_fkey',
      'subjects_school_id_fkey',
      'course_subjects_school_id_fkey',
      'courses_academic_year_school_fkey',
      'course_subjects_course_school_fkey',
      'course_subjects_subject_school_fkey',
      'course_subjects_academic_year_school_fkey'
    )
  ) <> 8 then
    raise exception 'A configuration ownership constraint is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'public.active_academic_year_id()'::regprocedure
  ) or not exists (
    select 1
    from pg_proc
    where oid = 'public.active_academic_year_id(uuid)'::regprocedure
  ) then
    raise exception 'Active academic year compatibility functions are missing.';
  end if;

  if (
    select count(*)
    from pg_proc
    where oid in (
      'public.is_active_school_member(uuid)'::regprocedure,
      'public.has_school_role(uuid,public.app_role[])'::regprocedure,
      'public.can_manage_school_configuration(uuid)'::regprocedure
    )
      and prosecdef = true
  ) <> 3 then
    raise exception 'Tenant authorization helpers are not protected.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'academic_years',
        'courses',
        'subjects',
        'course_subjects'
      )
      and coalesce(qual, '') = 'true'
  ) then
    raise exception 'A permissive configuration SELECT policy remains.';
  end if;
end
$catalog_checks$;

do $fixture_checks$
begin
  if (select count(*) from public.academic_years) <> 2
     or (select count(*) from public.courses) <> 2
     or (select count(*) from public.subjects) <> 3
     or (select count(*) from public.course_subjects) <> 3 then
    raise exception 'Unexpected configuration fixture count.';
  end if;

  if exists (
    select 1
    from public.academic_years
    where id not in (
      '20e20000-0000-4000-8000-000000000001',
      '20f30000-0000-4000-8000-000000000001'
    )
  ) or exists (
    select 1
    from public.courses
    where id not in (
      '20e20000-0000-4000-8000-000000000101',
      '20f30000-0000-4000-8000-000000000101'
    )
  ) or exists (
    select 1
    from public.subjects
    where id not in (
      '20e20000-0000-4000-8000-000000000201',
      '20f30000-0000-4000-8000-000000000201',
      '20f30000-0000-4000-8000-000000000202'
    )
  ) or exists (
    select 1
    from public.course_subjects
    where id not in (
      '20e20000-0000-4000-8000-000000000301',
      '20f30000-0000-4000-8000-000000000301',
      '20f30000-0000-4000-8000-000000000302'
    )
  ) then
    raise exception 'Non-QA academic configuration exists in staging.';
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
    left join public.academic_years academic_year
      on academic_year.id = relation.academic_year_id
    where relation.school_id is distinct from course.school_id
       or relation.school_id is distinct from subject.school_id
       or (
         relation.academic_year_id is not null
         and relation.school_id is distinct from academic_year.school_id
       )
  ) then
    raise exception 'A cross-school configuration relationship exists.';
  end if;

  if public.active_academic_year_id(
    '20e10000-0000-4000-8000-000000000001'
  ) <> '20e20000-0000-4000-8000-000000000001'
     or public.active_academic_year_id(
       '20f20000-0000-4000-8000-000000000001'
     ) <> '20f30000-0000-4000-8000-000000000001'
     or public.active_academic_year_id()
       <> '20f30000-0000-4000-8000-000000000001' then
    raise exception 'Active academic year lookup is not tenant-aware.';
  end if;
end
$fixture_checks$;

begin;
update public.school_memberships
set active = false
where user_id = '20e10000-0000-4000-8000-000000000103'
  and school_id = '20f20000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $qa_school_tutor_checks$
begin
  if (select count(*) from public.academic_years) <> 1
     or (select count(*) from public.courses) <> 1
     or (select count(*) from public.subjects) <> 1
     or (select count(*) from public.course_subjects) <> 1 then
    raise exception 'QA School tutor configuration isolation failed.';
  end if;

  if exists (
    select 1
    from public.courses
    where school_id <> '20e10000-0000-4000-8000-000000000001'
  ) then
    raise exception 'QA School tutor can read another tenant course.';
  end if;

  begin
    insert into public.subjects (school_id, name)
    values (
      '20e10000-0000-4000-8000-000000000001',
      'Unauthorized tutor subject'
    );
    raise exception 'Tutor unexpectedly wrote academic configuration.';
  exception
    when insufficient_privilege then null;
  end;
end
$qa_school_tutor_checks$;
rollback;

begin;
update public.school_memberships
set active = false
where user_id = '20e10000-0000-4000-8000-000000000103'
  and school_id = '20e10000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $penafort_tutor_checks$
begin
  if (select count(*) from public.academic_years) <> 1
     or (select count(*) from public.courses) <> 1
     or (select count(*) from public.subjects) <> 2
     or (select count(*) from public.course_subjects) <> 2 then
    raise exception 'Penafort tutor configuration isolation failed.';
  end if;

  if exists (
    select 1
    from public.subjects
    where school_id <> '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Penafort tutor can read another tenant subject.';
  end if;
end
$penafort_tutor_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000102',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $director_checks$
declare
  changed_rows integer;
begin
  if (select count(*) from public.academic_years) <> 2
     or (select count(*) from public.courses) <> 2
     or (select count(*) from public.subjects) <> 3
     or (select count(*) from public.course_subjects) <> 3 then
    raise exception 'Director cannot read authorized tenant configuration.';
  end if;

  update public.subjects
  set name = 'Unauthorized director update'
  where id = '20e20000-0000-4000-8000-000000000201';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 0 then
    raise exception 'Director unexpectedly edited academic configuration.';
  end if;
end
$director_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000105',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $no_membership_checks$
begin
  if exists (select 1 from public.academic_years)
     or exists (select 1 from public.courses)
     or exists (select 1 from public.subjects)
     or exists (select 1 from public.course_subjects) then
    raise exception 'A user without membership can read configuration.';
  end if;
end
$no_membership_checks$;
rollback;

begin;
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

do $inactive_membership_checks$
begin
  if exists (select 1 from public.academic_years)
     or exists (select 1 from public.courses)
     or exists (select 1 from public.subjects)
     or exists (select 1 from public.course_subjects) then
    raise exception 'An inactive membership grants configuration access.';
  end if;
end
$inactive_membership_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000101',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $superadmin_checks$
begin
  if (select count(*) from public.academic_years) <> 2
     or (select count(*) from public.courses) <> 2
     or (select count(*) from public.subjects) <> 3
     or (select count(*) from public.course_subjects) <> 3 then
    raise exception 'Superadmin cannot supervise all tenant configuration.';
  end if;

  insert into public.subjects (school_id, name)
  values (
    '20e10000-0000-4000-8000-000000000001',
    'Temporary superadmin subject'
  );

  if not exists (
    select 1
    from public.subjects
    where name = 'Temporary superadmin subject'
  ) then
    raise exception 'Controlled superadmin configuration write failed.';
  end if;
end
$superadmin_checks$;
rollback;

begin;
do $integrity_checks$
begin
  begin
    insert into public.academic_years (
      school_id,
      name,
      start_date,
      end_date,
      active
    )
    values (
      '20e10000-0000-4000-8000-000000000001',
      'Second active QA year',
      '2027-09-01',
      '2028-06-30',
      true
    );
    raise exception 'A school received two active academic years.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.subjects (school_id, name)
    values (
      '20e10000-0000-4000-8000-000000000001',
      'Ciencias QA School'
    );
    raise exception 'A duplicate tenant subject name was accepted.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.course_subjects (
      school_id,
      course_id,
      subject_id,
      academic_year_id
    )
    values (
      '20f20000-0000-4000-8000-000000000001',
      '20f30000-0000-4000-8000-000000000101',
      '20e20000-0000-4000-8000-000000000201',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'A cross-school course-subject relation was accepted.';
  exception
    when foreign_key_violation then null;
  end;

  begin
    insert into public.subjects (school_id, name)
    values (
      '20ff0000-0000-4000-8000-000000000999',
      'Orphan subject'
    );
    raise exception 'An orphan school_id was accepted.';
  exception
    when foreign_key_violation then null;
  end;

  begin
    update public.subjects
    set school_id = '20e10000-0000-4000-8000-000000000001'
    where id = '20f30000-0000-4000-8000-000000000201';
    raise exception 'An owned subject crossed tenants.';
  exception
    when foreign_key_violation then null;
  end;
end
$integrity_checks$;
rollback;

select jsonb_build_object(
  'result', '20.2C configuration checks passed',
  'academic_years', (select count(*) from public.academic_years),
  'courses', (select count(*) from public.courses),
  'subjects', (select count(*) from public.subjects),
  'course_subjects', (select count(*) from public.course_subjects),
  'school_id_columns', (
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
      and is_nullable = 'NO'
  ),
  'checked_at', now()
) as configuration_checks;
