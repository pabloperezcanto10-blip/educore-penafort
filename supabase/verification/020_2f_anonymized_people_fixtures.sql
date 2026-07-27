-- SPRINT 20.2F - STAGING ONLY
-- Synthetic, temporary and fully removable people dataset.
--
-- Preconditions:
--   1. The linked project is Supabase staging zhnbrpcekmxldxlqrbhr.
--   2. Migrations 001-037 are aligned and db push --dry-run is empty.
--   3. The repository branch is staging at the expected Sprint 20.2F base.
--   4. 020_2f_cleanup.sql has not been pointed at any environment except staging.
--
-- This file intentionally persists fixtures so authenticated application
-- regression can run. Cleanup is exclusively handled by 020_2f_cleanup.sql.
-- It contains no real data and does not modify earlier QA fixtures.

begin;

do $preconditions$
begin
  if not exists (
    select 1
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
      and slug = 'qa-school'
      and active = true
  ) then
    raise exception 'STAGING GUARD: QA School is missing or inactive.';
  end if;

  if not exists (
    select 1
    from public.schools
    where id = '20f20000-0000-4000-8000-000000000001'
      and slug = 'colegio-penafort'
      and active = true
  ) then
    raise exception 'STAGING GUARD: Colegio Penafort QA is missing or inactive.';
  end if;

  if (
    select count(*)
    from public.academic_years
    where (id, school_id, active) in (
      (
        '20e20000-0000-4000-8000-000000000001'::uuid,
        '20e10000-0000-4000-8000-000000000001'::uuid,
        true
      ),
      (
        '20f30000-0000-4000-8000-000000000001'::uuid,
        '20f20000-0000-4000-8000-000000000001'::uuid,
        true
      )
    )
  ) <> 2 then
    raise exception 'STAGING GUARD: the two prerequisite QA academic years are unavailable.';
  end if;

  if exists (
    select 1
    from auth.users
    where email like '20_2f.%@example.test'
       or id between
         '202f1000-0000-4000-8000-000000000001'::uuid
         and '202f1000-0000-4000-8000-000000000013'::uuid
  ) then
    raise exception '20_2F auth fixtures already exist. Run scoped cleanup first.';
  end if;

  if exists (
    select 1
    from public.schools
    where id = '202f0000-0000-4000-8000-000000000001'
       or slug = '20-2f-inactive-school'
  ) then
    raise exception '20_2F inactive school fixture already exists.';
  end if;

  if exists (
    select 1
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) then
    raise exception '20_2F student fixtures already exist.';
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
  '202f0000-0000-4000-8000-000000000001',
  '20_2F Inactive School',
  '20_2F Inactive',
  '20-2f-inactive-school',
  'suspended',
  false,
  '/brand/educacora/logo.svg',
  '#0F172A',
  '#2E7D5A',
  '#D4A64F',
  'example.test',
  '20_2f-inactive-calendar'
);

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
    '202f1000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '20_2f.superadmin@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Superadmin","role":"family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '20_2f.director.a@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Director A","role":"director"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    '20_2f.director.b@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Director B","role":"director"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    '20_2f.tutor.multi@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Tutor Multischool","role":"tutor"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000005',
    'authenticated',
    'authenticated',
    '20_2f.tutor.a@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Tutor A","role":"tutor"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000006',
    'authenticated',
    'authenticated',
    '20_2f.tutor.b@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Tutor B","role":"tutor"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000007',
    'authenticated',
    'authenticated',
    '20_2f.tutor.inactive@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Tutor Inactive","role":"tutor"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000008',
    'authenticated',
    'authenticated',
    '20_2f.family.multi@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Family Multi","role":"family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000009',
    'authenticated',
    'authenticated',
    '20_2f.family.second@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Family Second","role":"family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000010',
    'authenticated',
    'authenticated',
    '20_2f.family.b@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Family B","role":"family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000011',
    'authenticated',
    'authenticated',
    '20_2f.family.inactive@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Family Inactive","role":"family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000012',
    'authenticated',
    'authenticated',
    '20_2f.nomembership@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F No Membership","role":"family"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '202f1000-0000-4000-8000-000000000013',
    'authenticated',
    'authenticated',
    '20_2f.incompatible@example.test',
    '',
    now(),
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"20_2F Incompatible Role","role":"director"}'::jsonb,
    now(),
    now()
  );

update public.profiles profile
set
  full_name = fixture.full_name,
  role = fixture.role,
  active = true,
  must_change_password = false
from (
  values
    ('202f1000-0000-4000-8000-000000000001'::uuid, '20_2F Superadmin', 'superadmin'::public.app_role),
    ('202f1000-0000-4000-8000-000000000002'::uuid, '20_2F Director A', 'director'::public.app_role),
    ('202f1000-0000-4000-8000-000000000003'::uuid, '20_2F Director B', 'director'::public.app_role),
    ('202f1000-0000-4000-8000-000000000004'::uuid, '20_2F Tutor Multischool', 'tutor'::public.app_role),
    ('202f1000-0000-4000-8000-000000000005'::uuid, '20_2F Tutor A', 'tutor'::public.app_role),
    ('202f1000-0000-4000-8000-000000000006'::uuid, '20_2F Tutor B', 'tutor'::public.app_role),
    ('202f1000-0000-4000-8000-000000000007'::uuid, '20_2F Tutor Inactive', 'tutor'::public.app_role),
    ('202f1000-0000-4000-8000-000000000008'::uuid, '20_2F Family Multi', 'family'::public.app_role),
    ('202f1000-0000-4000-8000-000000000009'::uuid, '20_2F Family Second', 'family'::public.app_role),
    ('202f1000-0000-4000-8000-000000000010'::uuid, '20_2F Family B', 'family'::public.app_role),
    ('202f1000-0000-4000-8000-000000000011'::uuid, '20_2F Family Inactive', 'family'::public.app_role),
    ('202f1000-0000-4000-8000-000000000012'::uuid, '20_2F No Membership', 'family'::public.app_role),
    ('202f1000-0000-4000-8000-000000000013'::uuid, '20_2F Incompatible Role', 'director'::public.app_role)
) as fixture(id, full_name, role)
where profile.id = fixture.id;

insert into public.school_memberships (
  id,
  school_id,
  user_id,
  role,
  active
)
values
  ('202f1100-0000-4000-8000-000000000001', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000001', 'superadmin', true),
  ('202f1100-0000-4000-8000-000000000002', '20e10000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000001', 'superadmin', true),
  ('202f1100-0000-4000-8000-000000000003', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000002', 'director', true),
  ('202f1100-0000-4000-8000-000000000004', '20e10000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000003', 'director', true),
  ('202f1100-0000-4000-8000-000000000005', '202f0000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000003', 'director', true),
  ('202f1100-0000-4000-8000-000000000006', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000004', 'tutor', true),
  ('202f1100-0000-4000-8000-000000000007', '20e10000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000004', 'tutor', true),
  ('202f1100-0000-4000-8000-000000000008', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000005', 'tutor', true),
  ('202f1100-0000-4000-8000-000000000009', '20e10000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000006', 'tutor', true),
  ('202f1100-0000-4000-8000-000000000010', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000007', 'tutor', true),
  ('202f1100-0000-4000-8000-000000000011', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000008', 'family', true),
  ('202f1100-0000-4000-8000-000000000012', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000009', 'family', true),
  ('202f1100-0000-4000-8000-000000000013', '20e10000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000010', 'family', true),
  ('202f1100-0000-4000-8000-000000000014', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000011', 'family', true),
  ('202f1100-0000-4000-8000-000000000015', '20f20000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000013', 'director', true);

insert into public.academic_years (
  id,
  name,
  start_date,
  end_date,
  active,
  school_id
)
values
  (
    '202f2000-0000-4000-8000-000000000001',
    '20_2F Historical Year A',
    '2024-09-01',
    '2025-06-30',
    false,
    '20f20000-0000-4000-8000-000000000001'
  ),
  (
    '202f2000-0000-4000-8000-000000000002',
    '20_2F Historical Year B',
    '2024-09-01',
    '2025-06-30',
    false,
    '20e10000-0000-4000-8000-000000000001'
  );

insert into public.courses (id, name, academic_year_id, school_id)
values
  ('202f3000-0000-4000-8000-000000000001', '20_2F 5A', '20f30000-0000-4000-8000-000000000001', '20f20000-0000-4000-8000-000000000001'),
  ('202f3000-0000-4000-8000-000000000002', '20_2F 6A', '20f30000-0000-4000-8000-000000000001', '20f20000-0000-4000-8000-000000000001'),
  ('202f3000-0000-4000-8000-000000000003', '20_2F 5B', '20e20000-0000-4000-8000-000000000001', '20e10000-0000-4000-8000-000000000001'),
  ('202f3000-0000-4000-8000-000000000004', '20_2F 6B', '20e20000-0000-4000-8000-000000000001', '20e10000-0000-4000-8000-000000000001');

insert into public.subjects (id, name, school_id)
values
  ('202f4000-0000-4000-8000-000000000001', '20_2F Ciencias A', '20f20000-0000-4000-8000-000000000001'),
  ('202f4000-0000-4000-8000-000000000002', '20_2F Lengua A', '20f20000-0000-4000-8000-000000000001'),
  ('202f4000-0000-4000-8000-000000000003', '20_2F Matematicas A', '20f20000-0000-4000-8000-000000000001'),
  ('202f4000-0000-4000-8000-000000000004', '20_2F Ciencias B', '20e10000-0000-4000-8000-000000000001'),
  ('202f4000-0000-4000-8000-000000000005', '20_2F Lengua B', '20e10000-0000-4000-8000-000000000001'),
  ('202f4000-0000-4000-8000-000000000006', '20_2F Matematicas B', '20e10000-0000-4000-8000-000000000001');

insert into public.course_subjects (
  id,
  course_id,
  subject_id,
  academic_year_id,
  optional,
  track,
  school_id
)
values
  ('202f5000-0000-4000-8000-000000000001', '202f3000-0000-4000-8000-000000000001', '202f4000-0000-4000-8000-000000000002', '20f30000-0000-4000-8000-000000000001', false, null, '20f20000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000002', '202f3000-0000-4000-8000-000000000001', '202f4000-0000-4000-8000-000000000003', '20f30000-0000-4000-8000-000000000001', false, null, '20f20000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000003', '202f3000-0000-4000-8000-000000000002', '202f4000-0000-4000-8000-000000000001', '20f30000-0000-4000-8000-000000000001', false, null, '20f20000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000004', '202f3000-0000-4000-8000-000000000002', '202f4000-0000-4000-8000-000000000003', '20f30000-0000-4000-8000-000000000001', false, null, '20f20000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000005', '202f3000-0000-4000-8000-000000000003', '202f4000-0000-4000-8000-000000000005', '20e20000-0000-4000-8000-000000000001', false, null, '20e10000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000006', '202f3000-0000-4000-8000-000000000003', '202f4000-0000-4000-8000-000000000006', '20e20000-0000-4000-8000-000000000001', false, null, '20e10000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000007', '202f3000-0000-4000-8000-000000000004', '202f4000-0000-4000-8000-000000000004', '20e20000-0000-4000-8000-000000000001', false, null, '20e10000-0000-4000-8000-000000000001'),
  ('202f5000-0000-4000-8000-000000000008', '202f3000-0000-4000-8000-000000000004', '202f4000-0000-4000-8000-000000000006', '20e20000-0000-4000-8000-000000000001', false, null, '20e10000-0000-4000-8000-000000000001');

insert into public.teachers (
  id,
  name,
  email,
  can_be_tutor,
  school_id
)
values
  ('202f6000-0000-4000-8000-000000000001', '20_2F Legacy Teacher A1', '20_2f.legacy.teacher.a1@example.test', true, '20f20000-0000-4000-8000-000000000001'),
  ('202f6000-0000-4000-8000-000000000002', '20_2F Legacy Teacher A2', '20_2f.legacy.teacher.a2@example.test', false, '20f20000-0000-4000-8000-000000000001'),
  ('202f6000-0000-4000-8000-000000000003', '20_2F Legacy Teacher B1', '20_2f.legacy.teacher.b1@example.test', true, '20e10000-0000-4000-8000-000000000001'),
  ('202f6000-0000-4000-8000-000000000004', '20_2F Legacy Teacher B2', '20_2f.legacy.teacher.b2@example.test', false, '20e10000-0000-4000-8000-000000000001');

insert into public.families (id, name, email, phone, school_id)
values
  ('202f7000-0000-4000-8000-000000000001', '20_2F Legacy Family A Multi', '20_2f.legacy.family.a.multi@example.test', null, '20f20000-0000-4000-8000-000000000001'),
  ('202f7000-0000-4000-8000-000000000002', '20_2F Legacy Family A Second', '20_2f.legacy.family.a.second@example.test', null, '20f20000-0000-4000-8000-000000000001'),
  ('202f7000-0000-4000-8000-000000000003', '20_2F Legacy Family A Historical', '20_2f.legacy.family.a.historical@example.test', null, '20f20000-0000-4000-8000-000000000001'),
  ('202f7000-0000-4000-8000-000000000004', '20_2F Legacy Family B Multi', '20_2f.legacy.family.b.multi@example.test', null, '20e10000-0000-4000-8000-000000000001'),
  ('202f7000-0000-4000-8000-000000000005', '20_2F Legacy Family B Single', '20_2f.legacy.family.b.single@example.test', null, '20e10000-0000-4000-8000-000000000001');

insert into public.students (
  id,
  name,
  last_name,
  birth_date,
  course_id,
  tutor_teacher_id,
  active,
  academic_year_id
)
values
  ('202f8000-0000-4000-8000-000000000001', '20_2F Alumno A01', 'Sintetico', null, '202f3000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000004', true, '20f30000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000002', '20_2F Alumno A02', 'Sintetico', null, '202f3000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000004', true, '20f30000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000003', '20_2F Alumno A03', 'Sintetico', null, '202f3000-0000-4000-8000-000000000002', '202f1000-0000-4000-8000-000000000005', true, '20f30000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000004', '20_2F Alumno A04', 'Sintetico', null, '202f3000-0000-4000-8000-000000000002', '202f1000-0000-4000-8000-000000000005', true, '20f30000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000005', '20_2F Alumno A05', 'Sintetico', null, '202f3000-0000-4000-8000-000000000002', '202f1000-0000-4000-8000-000000000007', true, '20f30000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000006', '20_2F Alumno B01', 'Sintetico', null, '202f3000-0000-4000-8000-000000000003', '202f1000-0000-4000-8000-000000000004', true, '20e20000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000007', '20_2F Alumno B02', 'Sintetico', null, '202f3000-0000-4000-8000-000000000003', '202f1000-0000-4000-8000-000000000004', true, '20e20000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000008', '20_2F Alumno B03', 'Sintetico', null, '202f3000-0000-4000-8000-000000000004', '202f1000-0000-4000-8000-000000000006', true, '20e20000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000009', '20_2F Alumno B04', 'Sintetico', null, '202f3000-0000-4000-8000-000000000004', '202f1000-0000-4000-8000-000000000006', true, '20e20000-0000-4000-8000-000000000001'),
  ('202f8000-0000-4000-8000-000000000010', '20_2F Alumno B05', 'Sintetico', null, '202f3000-0000-4000-8000-000000000004', '202f1000-0000-4000-8000-000000000006', true, '20e20000-0000-4000-8000-000000000001');

insert into public.student_families (
  student_id,
  family_id,
  relation
)
values
  ('202f8000-0000-4000-8000-000000000001', '202f7000-0000-4000-8000-000000000001', 'responsible'),
  ('202f8000-0000-4000-8000-000000000002', '202f7000-0000-4000-8000-000000000001', 'responsible'),
  ('202f8000-0000-4000-8000-000000000001', '202f7000-0000-4000-8000-000000000002', 'responsible'),
  ('202f8000-0000-4000-8000-000000000003', '202f7000-0000-4000-8000-000000000003', 'historical'),
  ('202f8000-0000-4000-8000-000000000006', '202f7000-0000-4000-8000-000000000004', 'responsible'),
  ('202f8000-0000-4000-8000-000000000007', '202f7000-0000-4000-8000-000000000004', 'responsible'),
  ('202f8000-0000-4000-8000-000000000008', '202f7000-0000-4000-8000-000000000005', 'responsible');

insert into public.parent_students (
  id,
  parent_id,
  student_id
)
values
  ('202f9000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000008', '202f8000-0000-4000-8000-000000000001'),
  ('202f9000-0000-4000-8000-000000000002', '202f1000-0000-4000-8000-000000000008', '202f8000-0000-4000-8000-000000000002'),
  ('202f9000-0000-4000-8000-000000000003', '202f1000-0000-4000-8000-000000000009', '202f8000-0000-4000-8000-000000000001'),
  ('202f9000-0000-4000-8000-000000000004', '202f1000-0000-4000-8000-000000000011', '202f8000-0000-4000-8000-000000000003'),
  ('202f9000-0000-4000-8000-000000000005', '202f1000-0000-4000-8000-000000000010', '202f8000-0000-4000-8000-000000000006'),
  ('202f9000-0000-4000-8000-000000000006', '202f1000-0000-4000-8000-000000000010', '202f8000-0000-4000-8000-000000000007');

insert into public.teacher_assignments (
  id,
  teacher_id,
  subject_id,
  course_id,
  academic_year_id
)
values
  ('202fa000-0000-4000-8000-000000000001', '202f1000-0000-4000-8000-000000000004', '202f4000-0000-4000-8000-000000000003', '202f3000-0000-4000-8000-000000000001', '20f30000-0000-4000-8000-000000000001'),
  ('202fa000-0000-4000-8000-000000000002', '202f1000-0000-4000-8000-000000000004', '202f4000-0000-4000-8000-000000000006', '202f3000-0000-4000-8000-000000000003', '20e20000-0000-4000-8000-000000000001'),
  ('202fa000-0000-4000-8000-000000000003', '202f1000-0000-4000-8000-000000000005', '202f4000-0000-4000-8000-000000000002', '202f3000-0000-4000-8000-000000000001', '20f30000-0000-4000-8000-000000000001'),
  ('202fa000-0000-4000-8000-000000000004', '202f1000-0000-4000-8000-000000000005', '202f4000-0000-4000-8000-000000000001', '202f3000-0000-4000-8000-000000000002', '20f30000-0000-4000-8000-000000000001'),
  ('202fa000-0000-4000-8000-000000000005', '202f1000-0000-4000-8000-000000000006', '202f4000-0000-4000-8000-000000000005', '202f3000-0000-4000-8000-000000000003', '20e20000-0000-4000-8000-000000000001'),
  ('202fa000-0000-4000-8000-000000000006', '202f1000-0000-4000-8000-000000000006', '202f4000-0000-4000-8000-000000000004', '202f3000-0000-4000-8000-000000000004', '20e20000-0000-4000-8000-000000000001'),
  ('202fa000-0000-4000-8000-000000000007', '202f1000-0000-4000-8000-000000000007', '202f4000-0000-4000-8000-000000000003', '202f3000-0000-4000-8000-000000000002', '20f30000-0000-4000-8000-000000000001');

update public.school_memberships
set active = false, updated_at = now()
where id in (
  '202f1100-0000-4000-8000-000000000010',
  '202f1100-0000-4000-8000-000000000014'
);

do $postconditions$
begin
  if (
    select count(*)
    from auth.users
    where email like '20_2f.%@example.test'
  ) <> 13 then
    raise exception '20_2F auth fixture count mismatch.';
  end if;

  if (
    select count(*)
    from public.profiles
    where id between
      '202f1000-0000-4000-8000-000000000001'::uuid
      and '202f1000-0000-4000-8000-000000000013'::uuid
  ) <> 13 then
    raise exception '20_2F profile fixture count mismatch.';
  end if;

  if (
    select count(*)
    from public.school_memberships
    where id between
      '202f1100-0000-4000-8000-000000000001'::uuid
      and '202f1100-0000-4000-8000-000000000015'::uuid
  ) <> 15 then
    raise exception '20_2F membership fixture count mismatch.';
  end if;

  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 10 then
    raise exception '20_2F student fixture count mismatch.';
  end if;

  if (
    select count(*)
    from public.families
    where id between
      '202f7000-0000-4000-8000-000000000001'::uuid
      and '202f7000-0000-4000-8000-000000000005'::uuid
  ) <> 5 then
    raise exception '20_2F legacy family fixture count mismatch.';
  end if;

  if (
    select count(*)
    from public.teachers
    where id between
      '202f6000-0000-4000-8000-000000000001'::uuid
      and '202f6000-0000-4000-8000-000000000004'::uuid
  ) <> 4 then
    raise exception '20_2F legacy teacher fixture count mismatch.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
  ) <> 7 then
    raise exception '20_2F assignment fixture count mismatch.';
  end if;

  if exists (
    select 1
    from public.students student
    join public.courses course on course.id = student.course_id
    join public.academic_years academic_year on academic_year.id = student.academic_year_id
    where student.id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
      and (
        student.school_id <> course.school_id
        or student.school_id <> academic_year.school_id
      )
  ) then
    raise exception 'A 20_2F student has inconsistent tenant roots.';
  end if;

  if exists (
    select 1
    from public.teacher_assignments assignment
    join public.courses course on course.id = assignment.course_id
    join public.subjects subject on subject.id = assignment.subject_id
    join public.academic_years academic_year on academic_year.id = assignment.academic_year_id
    where assignment.id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
      and (
        assignment.school_id <> course.school_id
        or assignment.school_id <> subject.school_id
        or assignment.school_id <> academic_year.school_id
      )
  ) then
    raise exception 'A 20_2F teacher assignment has inconsistent tenant roots.';
  end if;
end
$postconditions$;

commit;

select
  '20_2F persistent synthetic fixtures loaded' as result,
  13 as auth_users,
  10 as students,
  5 as legacy_families,
  4 as legacy_teachers,
  7 as teacher_assignments;
