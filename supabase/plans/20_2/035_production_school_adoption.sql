-- DO NOT APPLY
-- DESIGN ONLY
-- PRODUCTION ADOPTION
-- NOT A MIGRATION
--
-- Purpose: adopt the existing Colegio Penafort installation as one tenant
-- after 034 has been applied to an isolated, restored production clone.
-- This design creates no Auth users, passwords, fixtures or operational data.

begin;

do $preflight$
declare
  expected_school_id constant uuid := '20f20000-0000-4000-8000-000000000001';
begin
  if to_regclass('public.schools') is null
     or to_regclass('public.school_memberships') is null then
    raise exception '035-PROD requires migration 034 on the restored clone.';
  end if;

  if (select count(*) from auth.users) <> 4
     or (select count(*) from public.profiles) <> 4 then
    raise exception '035-PROD requires exactly four retained identities and profiles.';
  end if;

  if exists (
    select 1
    from auth.users auth_user
    full join public.profiles profile on profile.id = auth_user.id
    where auth_user.id is null or profile.id is null
  ) then
    raise exception '035-PROD found an Auth/profile mismatch.';
  end if;

  if exists (
    select expected.role
    from (
      values
        ('superadmin'::public.app_role),
        ('director'::public.app_role),
        ('tutor'::public.app_role),
        ('family'::public.app_role)
    ) as expected(role)
    left join public.profiles profile
      on profile.role = expected.role
     and profile.active = true
    group by expected.role
    having count(profile.id) <> 1
  ) then
    raise exception '035-PROD requires one active profile for each retained role.';
  end if;

  if exists (
    select 1
    from public.profiles
    where active is not true
  ) then
    raise exception '035-PROD refuses inactive retained profiles.';
  end if;

  if exists (
    select 1
    from public.schools
    where id <> expected_school_id
       or slug <> 'colegio-penafort'
  ) then
    raise exception '035-PROD refuses an unexpected existing school.';
  end if;

  if exists (
    select 1
    from public.schools
    where slug = 'colegio-penafort'
      and id <> expected_school_id
  ) then
    raise exception 'The Colegio Penafort slug belongs to another school id.';
  end if;

  if exists (
    select 1
    from public.school_memberships membership
    where membership.school_id <> expected_school_id
       or not exists (
         select 1
         from public.profiles profile
         where profile.id = membership.user_id
           and profile.role = membership.role
           and profile.active = true
       )
  ) then
    raise exception '035-PROD found an unexpected or contradictory membership.';
  end if;
end
$preflight$;

insert into public.schools (
  id,
  name,
  short_name,
  slug,
  status,
  active,
  logo_url,
  primary_color,
  secondary_color,
  accent_color
)
values (
  '20f20000-0000-4000-8000-000000000001',
  'Colegio Peñafort',
  'Peñafort',
  'colegio-penafort',
  'active',
  true,
  '/branding/penafort-logo.jpg',
  '#075985',
  '#0F172A',
  '#0EA5E9'
)
on conflict (id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  slug = excluded.slug,
  status = excluded.status,
  active = excluded.active,
  logo_url = excluded.logo_url,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color;

insert into public.school_memberships (
  school_id,
  user_id,
  role,
  active
)
select
  '20f20000-0000-4000-8000-000000000001'::uuid,
  profile.id,
  profile.role,
  true
from public.profiles profile
where profile.active = true
  and profile.role in (
    'superadmin'::public.app_role,
    'director'::public.app_role,
    'tutor'::public.app_role,
    'family'::public.app_role
  )
on conflict (user_id, school_id, role) do update
set
  active = excluded.active,
  updated_at = now();

do $postflight$
declare
  expected_school_id constant uuid := '20f20000-0000-4000-8000-000000000001';
begin
  if (
    select count(*)
    from public.schools
    where id = expected_school_id
      and slug = 'colegio-penafort'
      and status = 'active'
      and active = true
  ) <> 1 then
    raise exception '035-PROD school adoption postcondition failed.';
  end if;

  if (
    select count(*)
    from public.school_memberships membership
    join public.profiles profile on profile.id = membership.user_id
    where membership.school_id = expected_school_id
      and membership.active = true
      and profile.active = true
      and profile.role = membership.role
  ) <> 4 then
    raise exception '035-PROD did not preserve four valid active memberships.';
  end if;

  if exists (
    select role
    from public.school_memberships
    where school_id = expected_school_id
      and active = true
    group by role
    having count(*) <> 1
  ) then
    raise exception '035-PROD produced an ambiguous role membership.';
  end if;

  if (select count(*) from auth.users) <> 4
     or (select count(*) from public.profiles) <> 4 then
    raise exception '035-PROD changed the retained identity count.';
  end if;
end
$postflight$;

commit;

-- Rollback rule for the future rehearsal:
-- 1. Any failure before COMMIT rolls back this transaction automatically.
-- 2. After COMMIT, restore the isolated clone snapshot. Do not delete or
--    deactivate production identities to emulate a rollback.
