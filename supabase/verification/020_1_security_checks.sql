-- Sprint 20.1E security checks for staging after applying migration 034.
-- Run after 020_1e_qa_setup.sql. Every behavioral write is rolled back.

do $$
begin
  if to_regclass('public.schools') is null then
    raise exception 'Missing public.schools';
  end if;

  if to_regclass('public.school_memberships') is null then
    raise exception 'Missing public.school_memberships';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.schools'::regclass
      and relrowsecurity = true
  ) then
    raise exception 'RLS is not enabled on public.schools';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.school_memberships'::regclass
      and relrowsecurity = true
  ) then
    raise exception 'RLS is not enabled on public.school_memberships';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('schools', 'school_memberships')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ) then
    raise exception 'A client write policy exists on a multitenant foundation table';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'profiles_protect_sensitive_fields'
      and tgenabled <> 'D'
  ) then
    raise exception 'Profile sensitive-field trigger is missing';
  end if;

  if to_regprocedure('public.protect_profile_sensitive_fields()') is null then
    raise exception 'Profile protection function is missing';
  end if;
end
$$;

select
  'multitenant foundation catalog checks passed' as result,
  now() as checked_at;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $tutor_checks$
declare
  affected_rows integer;
begin
  if (select count(*) from public.schools) <> 1 then
    raise exception 'An active tutor membership cannot resolve its school.';
  end if;

  if (
    select count(*)
    from public.school_memberships
    where user_id = auth.uid()
      and active = true
  ) <> 1 then
    raise exception 'Tutor cannot read exactly its own active membership.';
  end if;

  if exists (
    select 1
    from public.school_memberships
    where user_id <> auth.uid()
  ) then
    raise exception 'Tutor can read another user membership.';
  end if;

  begin
    insert into public.schools (name, short_name, slug)
    values ('Blocked School', 'Blocked', 'blocked-school');
    raise exception 'Tutor unexpectedly created a school.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.schools
    set name = 'Blocked update';
    raise exception 'Tutor unexpectedly modified a school.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.schools;
    raise exception 'Tutor unexpectedly deleted a school.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.school_memberships (
      school_id,
      user_id,
      role,
      active
    )
    values (
      '20e10000-0000-4000-8000-000000000001',
      auth.uid(),
      'director',
      true
    );
    raise exception 'Tutor unexpectedly created a membership.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.school_memberships
    set role = 'director'
    where user_id = auth.uid();
    raise exception 'Tutor unexpectedly changed a membership role.';
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

  begin
    update public.profiles
    set active = false
    where id = auth.uid();
    raise exception 'Tutor unexpectedly changed profiles.active.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.profiles
    set must_change_password = true
    where id = auth.uid();
    raise exception 'Tutor unexpectedly changed the password flag.';
  exception
    when insufficient_privilege then null;
  end;

  update public.profiles
  set full_name = 'QA Tutor Updated'
  where id = auth.uid();
  get diagnostics affected_rows = row_count;

  if affected_rows <> 1 then
    raise exception 'Tutor cannot update the authorized full_name field.';
  end if;
end
$tutor_checks$;
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
    raise exception 'A user without membership can read memberships.';
  end if;
end
$no_membership_checks$;
rollback;

begin;
update public.school_memberships
set active = false
where user_id = '20e10000-0000-4000-8000-000000000104';

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

  if exists (
    select 1
    from public.school_memberships
    where active = true
  ) then
    raise exception 'An inactive user can read an active membership.';
  end if;
end
$inactive_membership_checks$;
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
    raise exception 'Director unexpectedly changed its membership role.';
  exception
    when insufficient_privilege then null;
  end;
end
$director_checks$;
rollback;

begin;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000104',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $family_checks$
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
    set active = true,
        role = 'director'
    where user_id = auth.uid()
      and active = false;
    raise exception 'Family unexpectedly activated or promoted a membership.';
  exception
    when insufficient_privilege then null;
  end;
end
$family_checks$;
rollback;

select
  'multitenant foundation behavioral checks passed' as result,
  now() as checked_at;
