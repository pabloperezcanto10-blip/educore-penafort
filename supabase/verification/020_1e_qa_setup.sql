-- Sprint 20.1E: minimal, fictional QA fixtures for the isolated staging project.
-- Run only after scripts/assert-supabase-target.ps1 approves a staging write.

do $safety$
declare
  unexpected_table text;
begin
  if exists (
    select 1
    from auth.users
    where email is null
       or email not in (
         'qa.superadmin@example.test',
         'qa.director@example.test',
         'qa.tutor@example.test',
         'qa.family@example.test',
         'qa.nomembership@example.test'
       )
  ) then
    raise exception 'Refusing QA setup: non-QA Auth users exist.';
  end if;

  if exists (
    select 1
    from public.schools
    where slug <> 'qa-school'
  ) then
    raise exception 'Refusing QA setup: a non-QA school exists.';
  end if;

  foreach unexpected_table in array array[
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
    if exists (
      select 1
      from pg_class relation
      join pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public'
        and relation.relname = unexpected_table
        and relation.relkind = 'r'
    ) then
      execute format(
        'select case when exists (select 1 from public.%I) then %L end',
        unexpected_table,
        unexpected_table
      )
      into unexpected_table;

      if unexpected_table is not null then
        raise exception 'Refusing QA setup: operational table % is not empty.',
          unexpected_table;
      end if;
    end if;
  end loop;
end
$safety$;

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
  '20e10000-0000-4000-8000-000000000001',
  'QA School',
  'QA School',
  'qa-school',
  'active',
  true,
  '/brand/educacora/logo.svg',
  '#0F172A',
  '#2E7D5A',
  '#D4A64F',
  'example.test',
  'qa-school-calendar'
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

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20e10000-0000-4000-8000-000000000101',
    'authenticated',
    'authenticated',
    'qa.superadmin@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"QA Superadmin"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20e10000-0000-4000-8000-000000000102',
    'authenticated',
    'authenticated',
    'qa.director@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"QA Director"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20e10000-0000-4000-8000-000000000103',
    'authenticated',
    'authenticated',
    'qa.tutor@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"QA Tutor"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20e10000-0000-4000-8000-000000000104',
    'authenticated',
    'authenticated',
    'qa.family@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"QA Family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20e10000-0000-4000-8000-000000000105',
    'authenticated',
    'authenticated',
    'qa.nomembership@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"QA No Membership"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

update public.profiles profile
set
  full_name = qa_profile.full_name,
  role = qa_profile.role::public.app_role,
  active = true,
  must_change_password = false
from (
  values
    ('20e10000-0000-4000-8000-000000000101'::uuid, 'QA Superadmin', 'superadmin'),
    ('20e10000-0000-4000-8000-000000000102'::uuid, 'QA Director', 'director'),
    ('20e10000-0000-4000-8000-000000000103'::uuid, 'QA Tutor', 'tutor'),
    ('20e10000-0000-4000-8000-000000000104'::uuid, 'QA Family', 'family'),
    ('20e10000-0000-4000-8000-000000000105'::uuid, 'QA No Membership', 'family')
) as qa_profile(id, full_name, role)
where profile.id = qa_profile.id;

insert into public.school_memberships (
  id,
  school_id,
  user_id,
  role,
  active
)
values
  (
    '20e10000-0000-4000-8000-000000000201',
    '20e10000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000101',
    'superadmin',
    true
  ),
  (
    '20e10000-0000-4000-8000-000000000202',
    '20e10000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000102',
    'director',
    true
  ),
  (
    '20e10000-0000-4000-8000-000000000203',
    '20e10000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000103',
    'tutor',
    true
  ),
  (
    '20e10000-0000-4000-8000-000000000204',
    '20e10000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000104',
    'family',
    true
  ),
  (
    '20e10000-0000-4000-8000-000000000205',
    '20e10000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000104',
    'tutor',
    false
  )
on conflict (id) do update
set active = excluded.active;

select jsonb_build_object(
  'qa_school', (select count(*) from public.schools where slug = 'qa-school'),
  'qa_auth_users', (
    select count(*)
    from auth.users
    where email like 'qa.%@example.test'
  ),
  'qa_profiles', (
    select count(*)
    from public.profiles
    where email like 'qa.%@example.test'
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
  'users_without_membership', (
    select count(*)
    from auth.users auth_user
    where auth_user.email = 'qa.nomembership@example.test'
      and not exists (
        select 1
        from public.school_memberships membership
        where membership.user_id = auth_user.id
      )
  )
) as qa_setup;
