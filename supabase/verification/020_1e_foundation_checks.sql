-- Structural checks after migration 034 has been applied to staging.

do $checks$
declare
  original_table text;
begin
  foreach original_table in array array[
    'academic_years',
    'annual_evaluation_weights',
    'attendance_records',
    'audit_logs',
    'course_subjects',
    'courses',
    'evaluation_criteria',
    'evaluation_publications',
    'families',
    'final_course_grades',
    'final_evaluation_publications',
    'internal_notifications',
    'notifications',
    'parent_students',
    'partial_grades',
    'profiles',
    'quarter_final_grades',
    'student_attendance',
    'student_families',
    'student_incidents',
    'student_observations',
    'students',
    'subjects',
    'teacher_assignments',
    'teacher_schedule',
    'teachers',
    'term_subject_grades'
  ]
  loop
    if to_regclass(format('public.%I', original_table)) is null then
      raise exception 'Original table % is missing.', original_table;
    end if;
  end loop;

  if to_regclass('public.schools') is null
    or to_regclass('public.school_memberships') is null
  then
    raise exception 'Multitenant foundation tables are missing.';
  end if;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'schools'
      and column_name in (
        'id',
        'name',
        'short_name',
        'slug',
        'status',
        'active',
        'logo_url',
        'primary_color',
        'secondary_color',
        'accent_color',
        'family_email_domain',
        'calendar_id',
        'created_at',
        'updated_at'
      )
  ) <> 14 then
    raise exception 'schools columns do not match the expected foundation.';
  end if;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'school_memberships'
      and column_name in (
        'id',
        'school_id',
        'user_id',
        'role',
        'active',
        'created_at',
        'updated_at'
      )
  ) <> 7 then
    raise exception 'school_memberships columns do not match the expected foundation.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    raise exception 'profiles.role was removed.';
  end if;

  if (
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'schools_pkey',
        'schools_slug_key',
        'schools_active_status_idx',
        'school_memberships_pkey',
        'school_memberships_user_school_role_unique',
        'school_memberships_user_active_idx',
        'school_memberships_school_active_idx'
      )
  ) <> 7 then
    raise exception 'Expected multitenant indexes are missing.';
  end if;

  if (
    select count(*)
    from pg_trigger
    where not tgisinternal
      and tgname in (
        'schools_set_updated_at',
        'school_memberships_set_updated_at',
        'profiles_protect_sensitive_fields'
      )
  ) <> 3 then
    raise exception 'Expected multitenant/profile triggers are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.school_memberships'::regclass
      and conname = 'school_memberships_user_school_role_unique'
  ) then
    raise exception 'Membership uniqueness constraint is missing.';
  end if;

  if (
    select count(*)
    from pg_constraint
    where conrelid = 'public.school_memberships'::regclass
      and contype = 'f'
  ) <> 2 then
    raise exception 'Membership foreign keys are missing.';
  end if;

  if has_table_privilege('anon', 'public.schools', 'SELECT')
    or has_table_privilege('anon', 'public.school_memberships', 'SELECT')
  then
    raise exception 'anon unexpectedly has foundation table access.';
  end if;

  if not has_table_privilege('authenticated', 'public.schools', 'SELECT')
    or not has_table_privilege(
      'authenticated',
      'public.school_memberships',
      'SELECT'
    )
  then
    raise exception 'authenticated is missing foundation SELECT grants.';
  end if;

  if has_table_privilege('authenticated', 'public.schools', 'INSERT')
    or has_table_privilege('authenticated', 'public.schools', 'UPDATE')
    or has_table_privilege('authenticated', 'public.schools', 'DELETE')
    or has_table_privilege(
      'authenticated',
      'public.school_memberships',
      'INSERT'
    )
    or has_table_privilege(
      'authenticated',
      'public.school_memberships',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.school_memberships',
      'DELETE'
    )
  then
    raise exception 'authenticated unexpectedly has foundation write grants.';
  end if;
end
$checks$;

begin;
do $constraint_checks$
declare
  previous_school_updated_at timestamptz;
  previous_membership_updated_at timestamptz;
begin
  select updated_at
  into previous_school_updated_at
  from public.schools
  where id = '20e10000-0000-4000-8000-000000000001';

  update public.schools
  set short_name = short_name
  where id = '20e10000-0000-4000-8000-000000000001';

  if (
    select updated_at <= previous_school_updated_at
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
  ) then
    raise exception 'schools updated_at trigger did not advance.';
  end if;

  select updated_at
  into previous_membership_updated_at
  from public.school_memberships
  where id = '20e10000-0000-4000-8000-000000000203';

  update public.school_memberships
  set active = active
  where id = '20e10000-0000-4000-8000-000000000203';

  if (
    select updated_at <= previous_membership_updated_at
    from public.school_memberships
    where id = '20e10000-0000-4000-8000-000000000203'
  ) then
    raise exception 'school_memberships updated_at trigger did not advance.';
  end if;

  begin
    insert into public.school_memberships (
      school_id,
      user_id,
      role
    )
    values (
      '20e10000-0000-4000-8000-000000000999',
      '20e10000-0000-4000-8000-000000000103',
      'tutor'
    );
    raise exception 'Invalid school membership was accepted.';
  exception
    when foreign_key_violation then null;
  end;

  begin
    insert into public.school_memberships (
      school_id,
      user_id,
      role
    )
    values (
      '20e10000-0000-4000-8000-000000000001',
      '20e10000-0000-4000-8000-000000000999',
      'tutor'
    );
    raise exception 'Membership for an unknown user was accepted.';
  exception
    when foreign_key_violation then null;
  end;

  begin
    insert into public.school_memberships (
      school_id,
      user_id,
      role
    )
    values (
      '20e10000-0000-4000-8000-000000000001',
      '20e10000-0000-4000-8000-000000000103',
      'tutor'
    );
    raise exception 'Duplicate membership was accepted.';
  exception
    when unique_violation then null;
  end;

  begin
    insert into public.school_memberships (
      school_id,
      user_id,
      role
    )
    values (
      '20e10000-0000-4000-8000-000000000001',
      '20e10000-0000-4000-8000-000000000103',
      'owner'
    );
    raise exception 'Invalid membership role was accepted.';
  exception
    when invalid_text_representation then null;
  end;
end
$constraint_checks$;
rollback;

select jsonb_build_object(
  'public_tables', (
    select count(*)
    from pg_tables
    where schemaname = 'public'
  ),
  'schools_rls', (
    select relrowsecurity
    from pg_class
    where oid = 'public.schools'::regclass
  ),
  'school_memberships_rls', (
    select relrowsecurity
    from pg_class
    where oid = 'public.school_memberships'::regclass
  ),
  'foundation_policies', (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('schools', 'school_memberships')
  ),
  'foundation_indexes', (
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and tablename in ('schools', 'school_memberships')
  ),
  'profiles_role_exists', exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ),
  'profile_protection_enabled', exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'profiles_protect_sensitive_fields'
      and tgenabled <> 'D'
  )
) as foundation_checks;
