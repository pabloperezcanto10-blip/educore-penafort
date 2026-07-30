-- SPRINT 20.2J / 039B RLS matrix
-- STAGING ONLY. Every synthetic row lives inside this transaction.

begin;

create temporary table _039b_roots as
with roots as (
  select distinct on (school.id)
    school.id as school_id,
    academic_year.id as academic_year_id,
    course.id as course_id,
    subject.id as subject_id
  from public.schools school
  join public.academic_years academic_year
    on academic_year.school_id = school.id
  join public.courses course
    on course.school_id = school.id
   and course.academic_year_id = academic_year.id
  join public.course_subjects relation
    on relation.school_id = school.id
   and relation.academic_year_id = academic_year.id
   and relation.course_id = course.id
  join public.subjects subject
    on subject.id = relation.subject_id
   and subject.school_id = school.id
  where school.id in (
    '20f20000-0000-4000-8000-000000000001'::uuid,
    '20e10000-0000-4000-8000-000000000001'::uuid
  )
    and school.active = true
  order by school.id, academic_year.active desc, academic_year.id, course.id, subject.id
)
select
  case
    when school_id = '20f20000-0000-4000-8000-000000000001'::uuid then 'a'
    else 'b'
  end as slot,
  roots.*
from roots;

grant select on table _039b_roots to authenticated;

do $fixture_preconditions$
begin
  if (select count(*) from _039b_roots) <> 2
     or (select count(distinct slot) from _039b_roots) <> 2 then
    raise exception '039B tests require one audited academic root in each active staging tenant.';
  end if;

  if exists (
    select 1
    from auth.users
    where id between
      '040b1000-0000-4000-8000-000000000101'::uuid
      and '040b1000-0000-4000-8000-000000000112'::uuid
  ) then
    raise exception '039B synthetic Auth fixture identifiers already exist.';
  end if;
end
$fixture_preconditions$;

-- A third, inactive synthetic school exercises the inactive-school boundary.
insert into public.schools (
  id, name, short_name, slug, status, active
) values (
  '040b0000-0000-4000-8000-000000000001',
  '039B QA Inactive School',
  '039B Inactive',
  '039b-qa-inactive',
  'active',
  true
);

insert into public.academic_years (
  id, name, start_date, end_date, active, school_id
) values (
  '040b0000-0000-4000-8000-000000000002',
  '039B QA Year',
  '2098-09-01',
  '2099-06-30',
  true,
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.courses (
  id, name, academic_year_id, school_id
) values (
  '040b0000-0000-4000-8000-000000000003',
  '039B QA Course',
  '040b0000-0000-4000-8000-000000000002',
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.subjects (
  id, name, school_id
) values (
  '040b0000-0000-4000-8000-000000000004',
  '039B QA Subject',
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.course_subjects (
  id, course_id, subject_id, academic_year_id, school_id
) values (
  '040b0000-0000-4000-8000-000000000005',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000004',
  '040b0000-0000-4000-8000-000000000002',
  '040b0000-0000-4000-8000-000000000001'
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
select
  '00000000-0000-0000-0000-000000000000',
  fixture.id,
  'authenticated',
  'authenticated',
  fixture.email,
  '',
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', fixture.full_name),
  now(),
  now()
from (
  values
    ('040b1000-0000-4000-8000-000000000101'::uuid, '20_2j.superadmin@example.test', '039B QA Superadmin'),
    ('040b1000-0000-4000-8000-000000000102'::uuid, '20_2j.director-a@example.test', '039B QA Director A'),
    ('040b1000-0000-4000-8000-000000000103'::uuid, '20_2j.director-b@example.test', '039B QA Director B'),
    ('040b1000-0000-4000-8000-000000000104'::uuid, '20_2j.tutor-direct@example.test', '039B QA Direct Tutor'),
    ('040b1000-0000-4000-8000-000000000105'::uuid, '20_2j.tutor-assignment@example.test', '039B QA Assigned Tutor'),
    ('040b1000-0000-4000-8000-000000000106'::uuid, '20_2j.tutor-multischool@example.test', '039B QA Multischool Tutor'),
    ('040b1000-0000-4000-8000-000000000107'::uuid, '20_2j.family-a@example.test', '039B QA Family A'),
    ('040b1000-0000-4000-8000-000000000108'::uuid, '20_2j.family-b@example.test', '039B QA Family B'),
    ('040b1000-0000-4000-8000-000000000109'::uuid, '20_2j.inactive-membership@example.test', '039B QA Inactive Membership'),
    ('040b1000-0000-4000-8000-000000000110'::uuid, '20_2j.no-membership@example.test', '039B QA No Membership'),
    ('040b1000-0000-4000-8000-000000000111'::uuid, '20_2j.wrong-role@example.test', '039B QA Wrong Role'),
    ('040b1000-0000-4000-8000-000000000112'::uuid, '20_2j.inactive-school@example.test', '039B QA Inactive School Tutor')
) as fixture(id, email, full_name);

update public.profiles profile
set
  full_name = fixture.full_name,
  role = fixture.role::public.app_role,
  active = true,
  must_change_password = false
from (
  values
    ('040b1000-0000-4000-8000-000000000101'::uuid, '039B QA Superadmin', 'superadmin'),
    ('040b1000-0000-4000-8000-000000000102'::uuid, '039B QA Director A', 'director'),
    ('040b1000-0000-4000-8000-000000000103'::uuid, '039B QA Director B', 'director'),
    ('040b1000-0000-4000-8000-000000000104'::uuid, '039B QA Direct Tutor', 'tutor'),
    ('040b1000-0000-4000-8000-000000000105'::uuid, '039B QA Assigned Tutor', 'tutor'),
    ('040b1000-0000-4000-8000-000000000106'::uuid, '039B QA Multischool Tutor', 'tutor'),
    ('040b1000-0000-4000-8000-000000000107'::uuid, '039B QA Family A', 'family'),
    ('040b1000-0000-4000-8000-000000000108'::uuid, '039B QA Family B', 'family'),
    ('040b1000-0000-4000-8000-000000000109'::uuid, '039B QA Inactive Membership', 'tutor'),
    ('040b1000-0000-4000-8000-000000000110'::uuid, '039B QA No Membership', 'family'),
    ('040b1000-0000-4000-8000-000000000111'::uuid, '039B QA Wrong Role', 'family'),
    ('040b1000-0000-4000-8000-000000000112'::uuid, '039B QA Inactive School Tutor', 'tutor')
) as fixture(id, full_name, role)
where profile.id = fixture.id;

insert into public.school_memberships (
  id, school_id, user_id, role, active
)
select
  fixture.id,
  root.school_id,
  fixture.user_id,
  fixture.role::public.app_role,
  fixture.active
from (
  values
    ('040b2000-0000-4000-8000-000000000201'::uuid, 'a', '040b1000-0000-4000-8000-000000000102'::uuid, 'director', true),
    ('040b2000-0000-4000-8000-000000000202'::uuid, 'b', '040b1000-0000-4000-8000-000000000103'::uuid, 'director', true),
    ('040b2000-0000-4000-8000-000000000203'::uuid, 'a', '040b1000-0000-4000-8000-000000000104'::uuid, 'tutor', true),
    ('040b2000-0000-4000-8000-000000000204'::uuid, 'a', '040b1000-0000-4000-8000-000000000105'::uuid, 'tutor', true),
    ('040b2000-0000-4000-8000-000000000205'::uuid, 'a', '040b1000-0000-4000-8000-000000000106'::uuid, 'tutor', true),
    ('040b2000-0000-4000-8000-000000000206'::uuid, 'b', '040b1000-0000-4000-8000-000000000106'::uuid, 'tutor', true),
    ('040b2000-0000-4000-8000-000000000207'::uuid, 'a', '040b1000-0000-4000-8000-000000000107'::uuid, 'family', true),
    ('040b2000-0000-4000-8000-000000000208'::uuid, 'b', '040b1000-0000-4000-8000-000000000108'::uuid, 'family', true),
    ('040b2000-0000-4000-8000-000000000209'::uuid, 'a', '040b1000-0000-4000-8000-000000000109'::uuid, 'tutor', false),
    ('040b2000-0000-4000-8000-000000000210'::uuid, 'a', '040b1000-0000-4000-8000-000000000111'::uuid, 'family', true)
) as fixture(id, slot, user_id, role, active)
join _039b_roots root on root.slot = fixture.slot;

insert into public.school_memberships (
  id, school_id, user_id, role, active
) values (
  '040b2000-0000-4000-8000-000000000211',
  '040b0000-0000-4000-8000-000000000001',
  '040b1000-0000-4000-8000-000000000112',
  'tutor',
  true
);

insert into public.teacher_assignments (
  id, teacher_id, subject_id, course_id, academic_year_id, school_id
)
select
  fixture.id,
  fixture.teacher_id,
  root.subject_id,
  root.course_id,
  root.academic_year_id,
  root.school_id
from (
  values
    ('040b3000-0000-4000-8000-000000000301'::uuid, 'a', '040b1000-0000-4000-8000-000000000105'::uuid),
    ('040b3000-0000-4000-8000-000000000302'::uuid, 'a', '040b1000-0000-4000-8000-000000000106'::uuid),
    ('040b3000-0000-4000-8000-000000000303'::uuid, 'b', '040b1000-0000-4000-8000-000000000106'::uuid)
) as fixture(id, slot, teacher_id)
join _039b_roots root on root.slot = fixture.slot;

insert into public.teacher_assignments (
  id, teacher_id, subject_id, course_id, academic_year_id, school_id
) values (
  '040b3000-0000-4000-8000-000000000304',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000004',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.students (
  id, name, last_name, course_id, tutor_teacher_id, active,
  academic_year_id, school_id
)
select
  fixture.id,
  '039B QA',
  fixture.last_name,
  root.course_id,
  fixture.tutor_teacher_id,
  true,
  root.academic_year_id,
  root.school_id
from (
  values
    ('040b4000-0000-4000-8000-000000000401'::uuid, 'a', 'Student A1', '040b1000-0000-4000-8000-000000000104'::uuid),
    ('040b4000-0000-4000-8000-000000000402'::uuid, 'a', 'Student A2', null::uuid),
    ('040b4000-0000-4000-8000-000000000403'::uuid, 'b', 'Student B1', '040b1000-0000-4000-8000-000000000106'::uuid)
) as fixture(id, slot, last_name, tutor_teacher_id)
join _039b_roots root on root.slot = fixture.slot;

insert into public.students (
  id, name, last_name, course_id, tutor_teacher_id, active,
  academic_year_id, school_id
) values (
  '040b4000-0000-4000-8000-000000000404',
  '039B QA',
  'Inactive School Student',
  '040b0000-0000-4000-8000-000000000003',
  '040b1000-0000-4000-8000-000000000112',
  true,
  '040b0000-0000-4000-8000-000000000002',
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.parent_students (
  id, parent_id, student_id, school_id
)
values
  (
    '040b5000-0000-4000-8000-000000000501',
    '040b1000-0000-4000-8000-000000000107',
    '040b4000-0000-4000-8000-000000000401',
    (select school_id from _039b_roots where slot = 'a')
  ),
  (
    '040b5000-0000-4000-8000-000000000502',
    '040b1000-0000-4000-8000-000000000108',
    '040b4000-0000-4000-8000-000000000403',
    (select school_id from _039b_roots where slot = 'b')
  );

-- Academic rows are inserted as the database owner. The role tests below use
-- authenticated sessions and therefore exercise 040 RLS.
insert into public.partial_grades (
  id, student_id, teacher_id, subject_id, course_id, academic_year_id,
  term, assessment_type, assessment_name, grade, visible_to_family, school_id
)
select
  fixture.id,
  fixture.student_id,
  fixture.teacher_id,
  root.subject_id,
  root.course_id,
  root.academic_year_id,
  fixture.term,
  'parcial',
  fixture.assessment_name,
  fixture.grade,
  fixture.visible_to_family,
  root.school_id
from (
  values
    ('040b6000-0000-4000-8000-000000000601'::uuid, 'a', '040b4000-0000-4000-8000-000000000401'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid, '1', 'visible A1', 8.5, true),
    ('040b6000-0000-4000-8000-000000000602'::uuid, 'a', '040b4000-0000-4000-8000-000000000401'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid, '1', 'hidden A1', 7.5, false),
    ('040b6000-0000-4000-8000-000000000603'::uuid, 'a', '040b4000-0000-4000-8000-000000000402'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid, '1', 'assigned A2', 8.0, true),
    ('040b6000-0000-4000-8000-000000000604'::uuid, 'a', '040b4000-0000-4000-8000-000000000402'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid, '1', 'multischool A', 9.0, true),
    ('040b6000-0000-4000-8000-000000000605'::uuid, 'b', '040b4000-0000-4000-8000-000000000403'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid, '1', 'multischool B', 9.5, true)
) as fixture(
  id, slot, student_id, teacher_id, term, assessment_name, grade, visible_to_family
)
join _039b_roots root on root.slot = fixture.slot;

insert into public.partial_grades (
  id, student_id, teacher_id, subject_id, course_id, academic_year_id,
  term, assessment_type, assessment_name, grade, visible_to_family, school_id
) values (
  '040b6000-0000-4000-8000-000000000606',
  '040b4000-0000-4000-8000-000000000404',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000004',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  '1',
  'parcial',
  'inactive school',
  6,
  true,
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.evaluation_criteria (
  id, teacher_id, course_id, subject_id, academic_year_id,
  term, name, weight, criterion_type, visible_to_family, school_id
)
select
  fixture.id,
  fixture.teacher_id,
  root.course_id,
  root.subject_id,
  root.academic_year_id,
  '1',
  fixture.name,
  50,
  'parcial',
  true,
  root.school_id
from (
  values
    ('040b6100-0000-4000-8000-000000000611'::uuid, 'a', '040b1000-0000-4000-8000-000000000105'::uuid, 'Criterion A assigned'),
    ('040b6100-0000-4000-8000-000000000612'::uuid, 'a', '040b1000-0000-4000-8000-000000000106'::uuid, 'Criterion A multischool'),
    ('040b6100-0000-4000-8000-000000000613'::uuid, 'b', '040b1000-0000-4000-8000-000000000106'::uuid, 'Criterion B multischool')
) as fixture(id, slot, teacher_id, name)
join _039b_roots root on root.slot = fixture.slot;

insert into public.evaluation_criteria (
  id, teacher_id, course_id, subject_id, academic_year_id,
  term, name, weight, criterion_type, visible_to_family, school_id
) values (
  '040b6100-0000-4000-8000-000000000614',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000004',
  '040b0000-0000-4000-8000-000000000002',
  '1',
  'Criterion inactive school',
  100,
  'parcial',
  true,
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.quarter_final_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term, calculated_grade, final_grade, teacher_observation, school_id
)
select
  fixture.id,
  fixture.student_id,
  root.subject_id,
  fixture.teacher_id,
  root.course_id,
  root.academic_year_id,
  '1',
  8,
  8,
  '039B internal observation',
  root.school_id
from (
  values
    ('040b6200-0000-4000-8000-000000000621'::uuid, 'a', '040b4000-0000-4000-8000-000000000401'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid),
    ('040b6200-0000-4000-8000-000000000622'::uuid, 'a', '040b4000-0000-4000-8000-000000000402'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid),
    ('040b6200-0000-4000-8000-000000000623'::uuid, 'b', '040b4000-0000-4000-8000-000000000403'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid)
) as fixture(id, slot, student_id, teacher_id)
join _039b_roots root on root.slot = fixture.slot;

insert into public.quarter_final_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term, calculated_grade, final_grade, teacher_observation, school_id
) values (
  '040b6200-0000-4000-8000-000000000624',
  '040b4000-0000-4000-8000-000000000404',
  '040b0000-0000-4000-8000-000000000004',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  '1',
  6,
  6,
  '039B inactive observation',
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.term_subject_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term, calculated_grade, final_grade, final_observation, status, closed_at,
  school_id
)
select
  fixture.id,
  fixture.student_id,
  root.subject_id,
  fixture.teacher_id,
  root.course_id,
  root.academic_year_id,
  fixture.term,
  8,
  8,
  '039B family-facing observation',
  fixture.status,
  case when fixture.status = 'closed' then now() else null end,
  root.school_id
from (
  values
    ('040b6300-0000-4000-8000-000000000631'::uuid, 'a', '040b4000-0000-4000-8000-000000000401'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid, '1', 'closed'),
    ('040b6300-0000-4000-8000-000000000632'::uuid, 'a', '040b4000-0000-4000-8000-000000000401'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid, '2', 'closed'),
    ('040b6300-0000-4000-8000-000000000633'::uuid, 'a', '040b4000-0000-4000-8000-000000000402'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid, '1', 'closed'),
    ('040b6300-0000-4000-8000-000000000634'::uuid, 'b', '040b4000-0000-4000-8000-000000000403'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid, '1', 'closed')
) as fixture(id, slot, student_id, teacher_id, term, status)
join _039b_roots root on root.slot = fixture.slot;

insert into public.term_subject_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term, calculated_grade, final_grade, final_observation, status, closed_at,
  school_id
) values (
  '040b6300-0000-4000-8000-000000000635',
  '040b4000-0000-4000-8000-000000000404',
  '040b0000-0000-4000-8000-000000000004',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  '1',
  6,
  6,
  '039B inactive observation',
  'closed',
  now(),
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.evaluation_publications (
  id, course_id, academic_year_id, term, published, published_at,
  published_by, school_id
)
select
  fixture.id,
  root.course_id,
  root.academic_year_id,
  fixture.term,
  fixture.published,
  case when fixture.published then now() else null end,
  case when fixture.published then fixture.publisher_id else null end,
  root.school_id
from (
  values
    ('040b6400-0000-4000-8000-000000000641'::uuid, 'a', '1', true, '040b1000-0000-4000-8000-000000000102'::uuid),
    ('040b6400-0000-4000-8000-000000000642'::uuid, 'a', '2', false, null::uuid),
    ('040b6400-0000-4000-8000-000000000643'::uuid, 'b', '1', true, '040b1000-0000-4000-8000-000000000103'::uuid)
) as fixture(id, slot, term, published, publisher_id)
join _039b_roots root on root.slot = fixture.slot;

insert into public.evaluation_publications (
  id, course_id, academic_year_id, term, published, published_at,
  published_by, school_id
) values (
  '040b6400-0000-4000-8000-000000000644',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  '1',
  true,
  now(),
  '040b1000-0000-4000-8000-000000000101',
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.annual_evaluation_weights (
  id, teacher_id, course_id, subject_id, academic_year_id,
  term1_weight, term2_weight, term3_weight, school_id
)
select
  fixture.id,
  fixture.teacher_id,
  root.course_id,
  root.subject_id,
  root.academic_year_id,
  33.33,
  33.33,
  33.34,
  root.school_id
from (
  values
    ('040b6500-0000-4000-8000-000000000651'::uuid, 'a', '040b1000-0000-4000-8000-000000000105'::uuid),
    ('040b6500-0000-4000-8000-000000000652'::uuid, 'a', '040b1000-0000-4000-8000-000000000106'::uuid),
    ('040b6500-0000-4000-8000-000000000653'::uuid, 'b', '040b1000-0000-4000-8000-000000000106'::uuid)
) as fixture(id, slot, teacher_id)
join _039b_roots root on root.slot = fixture.slot;

insert into public.annual_evaluation_weights (
  id, teacher_id, course_id, subject_id, academic_year_id,
  term1_weight, term2_weight, term3_weight, school_id
) values (
  '040b6500-0000-4000-8000-000000000654',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000004',
  '040b0000-0000-4000-8000-000000000002',
  33.33,
  33.33,
  33.34,
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.final_course_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term1_weight, term2_weight, term3_weight, final_grade, final_observation,
  status, closed_at, school_id
)
select
  fixture.id,
  fixture.student_id,
  root.subject_id,
  fixture.teacher_id,
  root.course_id,
  root.academic_year_id,
  33.33,
  33.33,
  33.34,
  8,
  '039B final observation',
  fixture.status,
  case when fixture.status = 'closed' then now() else null end,
  root.school_id
from (
  values
    ('040b6600-0000-4000-8000-000000000661'::uuid, 'a', '040b4000-0000-4000-8000-000000000401'::uuid, '040b1000-0000-4000-8000-000000000105'::uuid, 'closed'),
    ('040b6600-0000-4000-8000-000000000662'::uuid, 'a', '040b4000-0000-4000-8000-000000000402'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid, 'draft'),
    ('040b6600-0000-4000-8000-000000000663'::uuid, 'b', '040b4000-0000-4000-8000-000000000403'::uuid, '040b1000-0000-4000-8000-000000000106'::uuid, 'closed')
) as fixture(id, slot, student_id, teacher_id, status)
join _039b_roots root on root.slot = fixture.slot;

insert into public.final_course_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term1_weight, term2_weight, term3_weight, final_grade, final_observation,
  status, closed_at, school_id
) values (
  '040b6600-0000-4000-8000-000000000664',
  '040b4000-0000-4000-8000-000000000404',
  '040b0000-0000-4000-8000-000000000004',
  '040b1000-0000-4000-8000-000000000112',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  33.33,
  33.33,
  33.34,
  6,
  '039B inactive final observation',
  'closed',
  now(),
  '040b0000-0000-4000-8000-000000000001'
);

insert into public.final_evaluation_publications (
  id, course_id, academic_year_id, published, published_at,
  published_by, school_id
)
select
  fixture.id,
  root.course_id,
  root.academic_year_id,
  fixture.published,
  case when fixture.published then now() else null end,
  case when fixture.published then fixture.publisher_id else null end,
  root.school_id
from (
  values
    ('040b6700-0000-4000-8000-000000000671'::uuid, 'a', true, '040b1000-0000-4000-8000-000000000102'::uuid),
    ('040b6700-0000-4000-8000-000000000672'::uuid, 'b', false, null::uuid)
) as fixture(id, slot, published, publisher_id)
join _039b_roots root on root.slot = fixture.slot;

insert into public.final_evaluation_publications (
  id, course_id, academic_year_id, published, published_at,
  published_by, school_id
) values (
  '040b6700-0000-4000-8000-000000000673',
  '040b0000-0000-4000-8000-000000000003',
  '040b0000-0000-4000-8000-000000000002',
  true,
  now(),
  '040b1000-0000-4000-8000-000000000101',
  '040b0000-0000-4000-8000-000000000001'
);

-- The fixture must be structurally valid before the school is suspended.
-- From this point onward, every academic helper must deny its rows.
update public.schools
set
  status = 'suspended',
  active = false
where id = '040b0000-0000-4000-8000-000000000001';

-- Superadmin: global supervision on active schools and controlled writes.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000101', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $superadmin_checks$
declare
  changed_rows integer;
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 5 then
    raise exception '039B: superadmin should read five rows from the two active schools only.';
  end if;

  if exists (
    select 1
    from public.partial_grades
    where id = '040b6000-0000-4000-8000-000000000606'
  ) then
    raise exception '039B: inactive-school academic data is visible to superadmin.';
  end if;

  update public.partial_grades
  set grade = grade
  where id = '040b6000-0000-4000-8000-000000000605';
  get diagnostics changed_rows = row_count;

  if changed_rows <> 1 then
    raise exception '039B: superadmin could not operate on an explicit active-school row.';
  end if;
end
$superadmin_checks$;
reset role;

-- Director A: school-scoped supervision and publication management only.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000102', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $director_a_checks$
declare
  changed_rows integer;
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 4 then
    raise exception '039B: Director A did not receive exactly School A grade rows.';
  end if;

  if exists (
    select 1
    from public.partial_grades
    where id in (
      '040b6000-0000-4000-8000-000000000605',
      '040b6000-0000-4000-8000-000000000606'
    )
  ) then
    raise exception '039B: Director A can read another or inactive school.';
  end if;

  update public.partial_grades
  set grade = grade
  where id = '040b6000-0000-4000-8000-000000000601';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception '039B: Director A unexpectedly modified a grade.';
  end if;

  update public.evaluation_publications
  set published = published
  where id = '040b6400-0000-4000-8000-000000000641';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception '039B: Director A could not manage its publication.';
  end if;

  update public.evaluation_publications
  set published = published
  where id = '040b6400-0000-4000-8000-000000000643';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception '039B: Director A modified a School B publication.';
  end if;

  begin
    insert into public.evaluation_publications (
      id, course_id, academic_year_id, term, published, published_at,
      published_by, school_id
    )
    select
      '040b6400-0000-4000-8000-000000000649',
      course_id,
      academic_year_id,
      '3',
      true,
      now(),
      '040b1000-0000-4000-8000-000000000102',
      school_id
    from _039b_roots
    where slot = 'b';
    raise exception '039B: Director A inserted a School B publication.';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;
end
$director_a_checks$;
reset role;

-- Director B: inverse isolation.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000103', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $director_b_checks$
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 1 then
    raise exception '039B: Director B did not receive exactly School B grade rows.';
  end if;

  if exists (
    select 1
    from public.partial_grades
    where school_id <> '20e10000-0000-4000-8000-000000000001'
      and id between
        '040b6000-0000-4000-8000-000000000601'::uuid
        and '040b6000-0000-4000-8000-000000000606'::uuid
  ) then
    raise exception '039B: Director B can read another school.';
  end if;
end
$director_b_checks$;
reset role;

-- Direct tutor: reads the complete academic context of the directly tutored
-- student, but cannot write without an exact teacher assignment.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000104', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $direct_tutor_checks$
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 2 then
    raise exception '039B: direct tutor did not receive the two direct-student partial grades.';
  end if;

  if (
    select count(*)
    from public.evaluation_criteria
    where id between
      '040b6100-0000-4000-8000-000000000611'::uuid
      and '040b6100-0000-4000-8000-000000000614'::uuid
  ) <> 2 then
    raise exception '039B: direct tutor cannot read the criteria of the tutored course.';
  end if;

  begin
    insert into public.partial_grades (
      id, student_id, teacher_id, subject_id, course_id, academic_year_id,
      term, assessment_type, assessment_name, grade, visible_to_family, school_id
    )
    select
      '040b6000-0000-4000-8000-000000000607',
      '040b4000-0000-4000-8000-000000000401',
      '040b1000-0000-4000-8000-000000000104',
      subject_id,
      course_id,
      academic_year_id,
      '2',
      'parcial',
      'direct tutor without assignment',
      8,
      true,
      school_id
    from _039b_roots
    where slot = 'a';
    raise exception '039B: direct tutor wrote without an assignment.';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;
end
$direct_tutor_checks$;
reset role;

-- Assigned tutor: exact course/subject/teacher ownership only.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000105', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $assigned_tutor_checks$
declare
  changed_rows integer;
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 3 then
    raise exception '039B: assigned tutor received an unexpected grade scope.';
  end if;

  insert into public.partial_grades (
    id, student_id, teacher_id, subject_id, course_id, academic_year_id,
    term, assessment_type, assessment_name, grade, visible_to_family, school_id
  )
  select
    '040b6000-0000-4000-8000-000000000608',
    '040b4000-0000-4000-8000-000000000402',
    '040b1000-0000-4000-8000-000000000105',
    subject_id,
    course_id,
    academic_year_id,
    '2',
    'parcial',
    'valid assigned write',
    8,
    true,
    school_id
  from _039b_roots
  where slot = 'a';

  update public.partial_grades
  set grade = grade
  where id = '040b6000-0000-4000-8000-000000000602';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception '039B: assigned tutor could not update an owned row.';
  end if;

  update public.partial_grades
  set grade = grade
  where id = '040b6000-0000-4000-8000-000000000604';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception '039B: assigned tutor updated another teacher row.';
  end if;

  begin
    insert into public.evaluation_publications (
      id, course_id, academic_year_id, term, published, published_at,
      published_by, school_id
    )
    select
      '040b6400-0000-4000-8000-000000000648',
      course_id,
      academic_year_id,
      '3',
      true,
      now(),
      '040b1000-0000-4000-8000-000000000105',
      school_id
    from _039b_roots
    where slot = 'a';
    raise exception '039B: tutor unexpectedly published an evaluation.';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;
end
$assigned_tutor_checks$;
reset role;

-- Multischool tutor: RLS authorizes both memberships without first-membership
-- inference; ActiveSchoolContext is represented by the explicit school filter.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000106', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $multischool_tutor_checks$
begin
  if (
    select count(*)
    from public.partial_grades
    where teacher_id = auth.uid()
      and id between
        '040b6000-0000-4000-8000-000000000601'::uuid
        and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 2 then
    raise exception '039B: multischool tutor did not receive both authorized assignment rows.';
  end if;

  if (
    select count(*)
    from public.partial_grades
    where teacher_id = auth.uid()
      and school_id = '20f20000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception '039B: ActiveSchoolContext A filter returned an unexpected scope.';
  end if;

  if (
    select count(*)
    from public.partial_grades
    where teacher_id = auth.uid()
      and school_id = '20e10000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception '039B: ActiveSchoolContext B filter returned an unexpected scope.';
  end if;

  if exists (
    select 1
    from public.partial_grades
    where school_id = '040b0000-0000-4000-8000-000000000001'
  ) then
    raise exception '039B: multischool tutor can read inactive-school data.';
  end if;
end
$multischool_tutor_checks$;
reset role;

-- Family A: relation + partial visibility; term/final require publication.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000107', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $family_a_checks$
declare
  changed_rows integer;
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 1 then
    raise exception '039B: Family A should read exactly one visible related partial grade.';
  end if;

  if exists (
    select 1
    from public.partial_grades
    where id = '040b6000-0000-4000-8000-000000000602'
  ) then
    raise exception '039B: Family A can read a hidden partial grade.';
  end if;

  if (
    select count(*)
    from public.term_subject_grades
    where id between
      '040b6300-0000-4000-8000-000000000631'::uuid
      and '040b6300-0000-4000-8000-000000000635'::uuid
  ) <> 1 then
    raise exception '039B: Family A should read exactly one closed and published term grade.';
  end if;

  if exists (
    select 1
    from public.term_subject_grades
    where id = '040b6300-0000-4000-8000-000000000632'
  ) then
    raise exception '039B: Family A can read an unpublished term grade.';
  end if;

  if (
    select count(*)
    from public.final_course_grades
    where id between
      '040b6600-0000-4000-8000-000000000661'::uuid
      and '040b6600-0000-4000-8000-000000000664'::uuid
  ) <> 1 then
    raise exception '039B: Family A should read exactly one closed and published final grade.';
  end if;

  if exists (
    select 1
    from public.quarter_final_grades
    where id between
      '040b6200-0000-4000-8000-000000000621'::uuid
      and '040b6200-0000-4000-8000-000000000624'::uuid
  ) then
    raise exception '039B: Family A can read internal quarter rows.';
  end if;

  if exists (
    select 1
    from public.evaluation_criteria
    where id between
      '040b6100-0000-4000-8000-000000000611'::uuid
      and '040b6100-0000-4000-8000-000000000614'::uuid
  ) then
    raise exception '039B: Family A can read internal criteria.';
  end if;

  update public.partial_grades
  set grade = grade
  where id = '040b6000-0000-4000-8000-000000000601';
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then
    raise exception '039B: Family A unexpectedly updated a grade.';
  end if;

  begin
    insert into public.partial_grades (
      id, student_id, teacher_id, subject_id, course_id, academic_year_id,
      term, assessment_type, assessment_name, grade, visible_to_family, school_id
    )
    select
      '040b6000-0000-4000-8000-000000000609',
      '040b4000-0000-4000-8000-000000000401',
      '040b1000-0000-4000-8000-000000000105',
      subject_id,
      course_id,
      academic_year_id,
      '3',
      'parcial',
      'family write attempt',
      10,
      true,
      school_id
    from _039b_roots
    where slot = 'a';
    raise exception '039B: Family A inserted a grade.';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;
end
$family_a_checks$;
reset role;

-- Family B: inverse relation and unpublished final boundary.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000108', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $family_b_checks$
begin
  if (
    select count(*)
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) <> 1 then
    raise exception '039B: Family B should read exactly its visible related partial grade.';
  end if;

  if (
    select count(*)
    from public.term_subject_grades
    where id between
      '040b6300-0000-4000-8000-000000000631'::uuid
      and '040b6300-0000-4000-8000-000000000635'::uuid
  ) <> 1 then
    raise exception '039B: Family B should read its published term grade.';
  end if;

  if exists (
    select 1
    from public.final_course_grades
    where id = '040b6600-0000-4000-8000-000000000663'
  ) then
    raise exception '039B: Family B can read a final grade without final publication.';
  end if;
end
$family_b_checks$;
reset role;

-- Inactive membership.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000109', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $inactive_membership_checks$
begin
  if exists (
    select 1
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) then
    raise exception '039B: inactive membership received academic rows.';
  end if;
end
$inactive_membership_checks$;
reset role;

-- No membership, even though profiles.role contains a legacy role.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000110', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $no_membership_checks$
begin
  if exists (
    select 1
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) then
    raise exception '039B: user without membership received academic rows.';
  end if;
end
$no_membership_checks$;
reset role;

-- Correct membership role but no functional relation: zero rows and no DML.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $wrong_role_checks$
begin
  if exists (
    select 1
    from public.partial_grades
    where id between
      '040b6000-0000-4000-8000-000000000601'::uuid
      and '040b6000-0000-4000-8000-000000000606'::uuid
  ) then
    raise exception '039B: unrelated family role received academic rows.';
  end if;
end
$wrong_role_checks$;
reset role;

-- Active membership in an inactive school must still yield zero.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000112', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $inactive_school_checks$
begin
  if exists (
    select 1
    from public.partial_grades
    where id = '040b6000-0000-4000-8000-000000000606'
  ) then
    raise exception '039B: active membership in an inactive school received academic rows.';
  end if;
end
$inactive_school_checks$;
reset role;

-- Structural negative cases remain enforced underneath RLS.
select set_config('request.jwt.claim.sub', '040b1000-0000-4000-8000-000000000105', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $cross_tenant_checks$
declare
  root_a record;
  root_b record;
begin
  select * into root_a from _039b_roots where slot = 'a';
  select * into root_b from _039b_roots where slot = 'b';

  begin
    insert into public.partial_grades (
      id, student_id, teacher_id, subject_id, course_id, academic_year_id,
      term, assessment_type, assessment_name, grade, visible_to_family, school_id
    ) values (
      '040b6000-0000-4000-8000-000000000610',
      '040b4000-0000-4000-8000-000000000401',
      '040b1000-0000-4000-8000-000000000105',
      root_b.subject_id,
      root_b.course_id,
      root_b.academic_year_id,
      '3',
      'parcial',
      'cross tenant',
      10,
      true,
      root_b.school_id
    );
    raise exception '039B: manipulated school_id crossed tenants.';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;

  begin
    insert into public.evaluation_criteria (
      id, teacher_id, course_id, subject_id, academic_year_id,
      term, name, weight, criterion_type, visible_to_family, school_id
    ) values (
      '040b6100-0000-4000-8000-000000000619',
      '040b1000-0000-4000-8000-000000000105',
      root_a.course_id,
      root_b.subject_id,
      root_a.academic_year_id,
      '3',
      'cross criterion',
      10,
      'parcial',
      true,
      root_a.school_id
    );
    raise exception '039B: criterion accepted a subject from another tenant.';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;
end
$cross_tenant_checks$;
reset role;

do $fixture_shape_checks$
begin
  if (select count(*) from public.partial_grades where id between '040b6000-0000-4000-8000-000000000601' and '040b6000-0000-4000-8000-000000000610') <> 7 then
    raise exception '039B: transactional partial-grade fixture shape changed unexpectedly.';
  end if;

  if (select count(*) from public.evaluation_publications where id between '040b6400-0000-4000-8000-000000000641' and '040b6400-0000-4000-8000-000000000649') <> 4 then
    raise exception '039B: transactional publication fixture shape changed unexpectedly.';
  end if;
end
$fixture_shape_checks$;

rollback;

select
  '039B RLS matrix passed' as result,
  'all synthetic rows rolled back' as persistence;
