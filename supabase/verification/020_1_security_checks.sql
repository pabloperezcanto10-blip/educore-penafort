-- Catalog-only checks for staging after applying migration 034.
-- The block raises an exception when a required security invariant is missing.

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
