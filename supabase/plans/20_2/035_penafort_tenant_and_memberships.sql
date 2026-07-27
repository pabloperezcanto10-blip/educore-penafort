-- DO NOT APPLY - DESIGN ONLY - SPRINT 20.2A
-- Proposed Wave 1. Must run first in staging during Sprint 20.2B.

begin;

do $preconditions$
begin
  if exists (
    select 1
    from public.profiles profile
    left join auth.users user_row on user_row.id = profile.id
    where user_row.id is null
  ) then
    raise exception 'Cannot create memberships: a profile has no Auth user.';
  end if;

  if exists (
    select 1 from public.schools
    where slug = 'colegio-penafort'
      and id <> '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'The Peñafort slug belongs to a different school id.';
  end if;

  if exists (
    select 1 from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
      and slug <> 'colegio-penafort'
  ) then
    raise exception 'The stable Peñafort id belongs to a different school.';
  end if;
end
$preconditions$;

insert into public.schools (
  id, name, short_name, slug, status, active, logo_url,
  primary_color, secondary_color, accent_color,
  family_email_domain, calendar_id
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
  status = excluded.status,
  active = excluded.active,
  logo_url = excluded.logo_url,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color,
  accent_color = excluded.accent_color,
  family_email_domain = excluded.family_email_domain,
  calendar_id = excluded.calendar_id;

insert into public.school_memberships (school_id, user_id, role, active)
select
  '20f20000-0000-4000-8000-000000000001',
  profile.id,
  profile.role,
  profile.active
from public.profiles profile
join auth.users user_row on user_row.id = profile.id
on conflict (user_id, school_id, role) do update
set active = excluded.active;

do $postconditions$
begin
  if (select count(*) from public.profiles) <> (
    select count(*) from public.school_memberships
    where school_id = '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Membership count does not match profile count.';
  end if;
end
$postconditions$;

commit;

-- Rollback: set memberships and school inactive. Keep profiles.role.
