-- Sprint 20.2B wave 1: establish the Peñafort tenant identity in staging.
-- This migration deliberately contains no operational or academic backfill.

begin;

do $preconditions$
declare
  required_qa_users integer;
begin
  if not exists (
    select 1
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
      and slug = 'qa-school'
  ) then
    raise exception 'Staging guard failed: QA School is missing.';
  end if;

  select count(*)
  into required_qa_users
  from (
    values
      ('qa.superadmin@example.test', 'superadmin'::public.app_role),
      ('qa.director@example.test', 'director'::public.app_role),
      ('qa.tutor@example.test', 'tutor'::public.app_role),
      ('qa.family@example.test', 'family'::public.app_role)
  ) as required_user(email, role)
  join auth.users auth_user on auth_user.email = required_user.email
  join public.profiles profile
    on profile.id = auth_user.id
   and profile.email = required_user.email
   and profile.role = required_user.role
   and profile.active = true;

  if required_qa_users <> 4 then
    raise exception 'Staging guard failed: required QA identities or roles are missing.';
  end if;

  if exists (
    select 1
    from public.schools
    where slug = 'colegio-penafort'
      and id <> '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'The Peñafort slug belongs to a different school id.';
  end if;

  if exists (
    select 1
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
      and slug <> 'colegio-penafort'
  ) then
    raise exception 'The stable Peñafort id belongs to a different school.';
  end if;

  if exists (
    select 1
    from public.schools
    where slug in ('colegio-educacora', 'educacora')
       or lower(name) = 'colegio educacora'
  ) then
    raise exception 'Colegio EducaCora must not exist in this wave.';
  end if;
end
$preconditions$;

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
  accent_color,
  family_email_domain,
  calendar_id
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
  '#0EA5E9',
  'penafort.com',
  'fo7mnf4nmdge5cib93bfq77414@group.calendar.google.com'
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
  accent_color = excluded.accent_color,
  family_email_domain = excluded.family_email_domain,
  calendar_id = excluded.calendar_id;

insert into public.school_memberships (
  id,
  school_id,
  user_id,
  role,
  active
)
select
  required_membership.id,
  '20f20000-0000-4000-8000-000000000001',
  auth_user.id,
  required_membership.role,
  true
from (
  values
    (
      '20f20000-0000-4000-8000-000000000101'::uuid,
      'qa.superadmin@example.test',
      'superadmin'::public.app_role
    ),
    (
      '20f20000-0000-4000-8000-000000000102'::uuid,
      'qa.director@example.test',
      'director'::public.app_role
    ),
    (
      '20f20000-0000-4000-8000-000000000103'::uuid,
      'qa.tutor@example.test',
      'tutor'::public.app_role
    ),
    (
      '20f20000-0000-4000-8000-000000000104'::uuid,
      'qa.family@example.test',
      'family'::public.app_role
    )
) as required_membership(id, email, role)
join auth.users auth_user on auth_user.email = required_membership.email
on conflict (user_id, school_id, role) do update
set
  active = excluded.active,
  updated_at = now();

do $postconditions$
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
      and family_email_domain = 'penafort.com'
  ) <> 1 then
    raise exception 'Peñafort tenant postcondition failed.';
  end if;

  if (
    select count(*)
    from public.school_memberships membership
    join auth.users auth_user on auth_user.id = membership.user_id
    where membership.school_id = '20f20000-0000-4000-8000-000000000001'
      and membership.active = true
      and (auth_user.email, membership.role) in (
        ('qa.superadmin@example.test', 'superadmin'::public.app_role),
        ('qa.director@example.test', 'director'::public.app_role),
        ('qa.tutor@example.test', 'tutor'::public.app_role),
        ('qa.family@example.test', 'family'::public.app_role)
      )
  ) <> 4 then
    raise exception 'Peñafort QA membership postcondition failed.';
  end if;

  if (
    select count(*)
    from public.school_memberships
    where school_id = '20f20000-0000-4000-8000-000000000001'
  ) <> 4 then
    raise exception 'Unexpected Peñafort memberships were created.';
  end if;

  if exists (
    select 1
    from public.school_memberships membership
    join auth.users auth_user on auth_user.id = membership.user_id
    where auth_user.email = 'qa.nomembership@example.test'
  ) then
    raise exception 'The no-membership QA identity received a membership.';
  end if;

  if not exists (
    select 1
    from public.school_memberships
    where id = '20e10000-0000-4000-8000-000000000205'
      and active = false
  ) then
    raise exception 'The inactive QA School membership was changed.';
  end if;
end
$postconditions$;

commit;

-- Operational rollback: deactivate the Peñafort school and its memberships.
-- profiles.role remains available and no operational table depends on this tenant yet.
