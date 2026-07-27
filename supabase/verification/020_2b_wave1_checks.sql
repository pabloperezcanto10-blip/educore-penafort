-- Sprint 20.2B wave 1 checks.
-- Run only in staging after 020_1e_qa_setup.sql and migration 035.
-- Every behavioral mutation is enclosed in a transaction that rolls back.

do $catalog_checks$
declare
  operational_school_id_columns integer;
begin
  if (
    select count(*)
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
      and name = 'Colegio Peñafort'
      and short_name = 'Peñafort'
      and slug = 'colegio-penafort'
      and status = 'active'
      and active = true
      and logo_url = '/branding/penafort-logo.jpg'
      and primary_color = '#075985'
      and secondary_color = '#0F172A'
      and accent_color = '#0EA5E9'
      and family_email_domain = 'penafort.com'
      and calendar_id = 'fo7mnf4nmdge5cib93bfq77414@group.calendar.google.com'
      and created_at is not null
      and updated_at is not null
  ) <> 1 then
    raise exception 'Peñafort tenant identity or branding is invalid.';
  end if;

  if (
    select count(*)
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
      and slug = 'qa-school'
  ) <> 1 then
    raise exception 'QA School no longer exists.';
  end if;

  if exists (
    select 1
    from public.schools
    where slug in ('colegio-educacora', 'educacora')
       or lower(name) = 'colegio educacora'
  ) then
    raise exception 'Colegio EducaCora was unexpectedly created.';
  end if;

  if (
    select count(*)
    from public.school_memberships membership
    join auth.users auth_user on auth_user.id = membership.user_id
    join public.profiles profile on profile.id = membership.user_id
    where membership.school_id = '20f20000-0000-4000-8000-000000000001'
      and membership.active = true
      and membership.role = profile.role
      and (auth_user.email, membership.role) in (
        ('qa.superadmin@example.test', 'superadmin'::public.app_role),
        ('qa.director@example.test', 'director'::public.app_role),
        ('qa.tutor@example.test', 'tutor'::public.app_role),
        ('qa.family@example.test', 'family'::public.app_role)
      )
  ) <> 4 then
    raise exception 'Peñafort QA memberships or roles are invalid.';
  end if;

  if (
    select count(*)
    from public.school_memberships
    where school_id = '20f20000-0000-4000-8000-000000000001'
  ) <> 4 then
    raise exception 'Peñafort has duplicated or unexpected memberships.';
  end if;

  if exists (
    select user_id, school_id, role
    from public.school_memberships
    group by user_id, school_id, role
    having count(*) > 1
  ) then
    raise exception 'Duplicate memberships exist.';
  end if;

  if exists (
    select 1
    from public.school_memberships membership
    left join auth.users auth_user on auth_user.id = membership.user_id
    left join public.schools school on school.id = membership.school_id
    where auth_user.id is null or school.id is null
  ) then
    raise exception 'An orphan membership exists.';
  end if;

  if exists (
    select 1
    from public.school_memberships membership
    join auth.users auth_user on auth_user.id = membership.user_id
    where auth_user.email = 'qa.nomembership@example.test'
  ) then
    raise exception 'The no-membership QA identity received access.';
  end if;

  if not exists (
    select 1
    from public.school_memberships
    where id = '20e10000-0000-4000-8000-000000000205'
      and active = false
  ) then
    raise exception 'The inactive QA membership was changed.';
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

  if not exists (
    select 1
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
    where auth_user.email = 'qa.superadmin@example.test'
      and profile.role = 'superadmin'
  ) then
    raise exception 'Global superadmin role was not preserved.';
  end if;

  select count(*)
  into operational_school_id_columns
  from information_schema.columns
  where table_schema = 'public'
    and column_name = 'school_id'
    and table_name <> 'school_memberships';

  if operational_school_id_columns <> 4 or exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'school_id'
      and table_name <> 'school_memberships'
      and table_name not in (
        'academic_years',
        'courses',
        'subjects',
        'course_subjects'
      )
  ) then
    raise exception 'An unexpected operational school_id column exists after wave 2.';
  end if;
end
$catalog_checks$;

select
  'wave 1 catalog checks passed' as result,
  now() as checked_at;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $tutor_rls_checks$
begin
  if (
    select count(*)
    from public.schools
    where id in (
      '20e10000-0000-4000-8000-000000000001',
      '20f20000-0000-4000-8000-000000000001'
    )
  ) <> 2 then
    raise exception 'Tutor cannot read both authorized schools.';
  end if;

  if exists (
    select 1
    from public.school_memberships
    where user_id <> auth.uid()
  ) then
    raise exception 'Tutor can read another user membership.';
  end if;

  begin
    update public.schools
    set active = false
    where id = '20f20000-0000-4000-8000-000000000001';
    raise exception 'Tutor unexpectedly edited Peñafort.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.school_memberships (school_id, user_id, role, active)
    values (
      '20f20000-0000-4000-8000-000000000001',
      auth.uid(),
      'director',
      true
    );
    raise exception 'Tutor unexpectedly created a director membership.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.profiles
    set role = 'director'
    where id = auth.uid();
    raise exception 'Tutor unexpectedly changed profiles.role.';
  exception
    when insufficient_privilege then null;
  end;
end
$tutor_rls_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000102',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $director_rls_checks$
begin
  begin
    update public.profiles
    set role = 'superadmin'
    where id = auth.uid();
    raise exception 'Director unexpectedly became superadmin.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.school_memberships
    set role = 'superadmin'
    where user_id = auth.uid();
    raise exception 'Director unexpectedly promoted its membership.';
  exception
    when insufficient_privilege then null;
  end;
end
$director_rls_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000104',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $family_rls_checks$
begin
  begin
    update public.profiles
    set role = 'director'
    where id = auth.uid();
    raise exception 'Family unexpectedly changed its profile role.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.school_memberships
    set school_id = '20e10000-0000-4000-8000-000000000001'
    where school_id = '20f20000-0000-4000-8000-000000000001'
      and user_id = auth.uid();
    raise exception 'Family unexpectedly changed its school.';
  exception
    when insufficient_privilege then null;
  end;
end
$family_rls_checks$;
rollback;

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

do $qa_only_isolation$
begin
  if exists (
    select 1
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'QA School membership grants Peñafort access.';
  end if;

  if not exists (
    select 1
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
  ) then
    raise exception 'QA School membership lost its own school access.';
  end if;
end
$qa_only_isolation$;
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

do $penafort_only_isolation$
begin
  if exists (
    select 1
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Peñafort membership grants QA School access.';
  end if;

  if not exists (
    select 1
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Peñafort membership lost its own school access.';
  end if;
end
$penafort_only_isolation$;
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
  if exists (select 1 from public.schools) then
    raise exception 'A user without membership can read a school.';
  end if;

  if exists (select 1 from public.school_memberships) then
    raise exception 'A user without membership can read a membership.';
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
  if exists (select 1 from public.schools) then
    raise exception 'An inactive membership grants school access.';
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
  if (
    select count(*)
    from public.schools
    where id in (
      '20e10000-0000-4000-8000-000000000001',
      '20f20000-0000-4000-8000-000000000001'
    )
  ) <> 2 then
    raise exception 'Superadmin cannot read schools covered by its memberships.';
  end if;

  if not public.current_user_has_role('superadmin') then
    raise exception 'Global superadmin capability was lost.';
  end if;
end
$superadmin_checks$;
rollback;

begin;
update public.schools
set active = false
where id = '20f20000-0000-4000-8000-000000000001';

update public.school_memberships
set active = false
where school_id = '20f20000-0000-4000-8000-000000000001';

do $rollback_simulation$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'school_id'
      and table_name in (
        'academic_years',
        'courses',
        'subjects',
        'course_subjects'
      )
  ) <> 4 or exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'school_id'
      and table_name <> 'school_memberships'
      and table_name not in (
        'academic_years',
        'courses',
        'subjects',
        'course_subjects'
      )
  ) then
    raise exception 'Rollback simulation found an unexpected tenant dependency.';
  end if;
end
$rollback_simulation$;
rollback;

do $rollback_postcondition$
begin
  if not exists (
    select 1
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
      and active = true
  ) then
    raise exception 'Rollback simulation changed the Peñafort tenant.';
  end if;

  if (
    select count(*)
    from public.school_memberships
    where school_id = '20f20000-0000-4000-8000-000000000001'
      and active = true
  ) <> 4 then
    raise exception 'Rollback simulation changed Peñafort memberships.';
  end if;
end
$rollback_postcondition$;

select jsonb_build_object(
  'result', 'wave 1 RLS, isolation, profile and rollback checks passed',
  'schools', (select count(*) from public.schools),
  'penafort_tenants', (
    select count(*)
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
  ),
  'qa_school_tenants', (
    select count(*)
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
  ),
  'active_memberships', (
    select count(*)
    from public.school_memberships
    where active = true
  ),
  'inactive_memberships', (
    select count(*)
    from public.school_memberships
    where active = false
  ),
  'penafort_memberships', (
    select count(*)
    from public.school_memberships
    where school_id = '20f20000-0000-4000-8000-000000000001'
  ),
  'operational_school_id_columns', (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'school_id'
      and table_name <> 'school_memberships'
  ),
  'checked_at', now()
) as wave_1_checks;
