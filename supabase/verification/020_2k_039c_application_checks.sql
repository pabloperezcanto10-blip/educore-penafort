-- SPRINT 20.2K / 039C application and ON CONFLICT checks
-- STAGING ONLY. Synthetic 20_2K_QA rows are always rolled back.

begin;

create temporary table _20_2k_roots as
with roots as (
  select distinct on (school.id)
    school.id as school_id,
    academic_year.id as academic_year_id,
    course.id as course_id,
    subject.id as subject_id
  from public.schools school
  join public.academic_years academic_year
    on academic_year.school_id = school.id
   and academic_year.active = true
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
  order by school.id, course.id, subject.id
)
select
  case
    when school_id = '20f20000-0000-4000-8000-000000000001'::uuid then 'a'
    else 'b'
  end as slot,
  roots.*
from roots;

grant select on table _20_2k_roots to authenticated;

do $preconditions$
begin
  if (select count(*) from _20_2k_roots) <> 2 then
    raise exception '20.2K requires one active academic root in each staging QA tenant.';
  end if;

  if exists (
    select 1
    from auth.users
    where email like '20_2k_qa.%@example.test'
  ) then
    raise exception '20.2K synthetic users already exist; run the targeted cleanup first.';
  end if;
end
$preconditions$;

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
    ('202c1000-0000-4000-8000-000000000101'::uuid, '20_2k_qa.superadmin@example.test', '20_2K_QA Superadmin'),
    ('202c1000-0000-4000-8000-000000000102'::uuid, '20_2k_qa.director-a@example.test', '20_2K_QA Director A'),
    ('202c1000-0000-4000-8000-000000000103'::uuid, '20_2k_qa.director-b@example.test', '20_2K_QA Director B'),
    ('202c1000-0000-4000-8000-000000000104'::uuid, '20_2k_qa.tutor-a@example.test', '20_2K_QA Tutor A'),
    ('202c1000-0000-4000-8000-000000000105'::uuid, '20_2k_qa.tutor-b@example.test', '20_2K_QA Tutor B'),
    ('202c1000-0000-4000-8000-000000000106'::uuid, '20_2k_qa.family-a@example.test', '20_2K_QA Family A'),
    ('202c1000-0000-4000-8000-000000000107'::uuid, '20_2k_qa.family-b@example.test', '20_2K_QA Family B'),
    ('202c1000-0000-4000-8000-000000000108'::uuid, '20_2k_qa.inactive@example.test', '20_2K_QA Inactive'),
    ('202c1000-0000-4000-8000-000000000109'::uuid, '20_2k_qa.no-membership@example.test', '20_2K_QA No Membership'),
    ('202c1000-0000-4000-8000-000000000110'::uuid, '20_2k_qa.unrelated-family@example.test', '20_2K_QA Unrelated Family'),
    ('202c1000-0000-4000-8000-000000000111'::uuid, '20_2k_qa.multischool@example.test', '20_2K_QA Multischool Tutor')
) as fixture(id, email, full_name);

update public.profiles profile
set
  full_name = fixture.full_name,
  role = fixture.role::public.app_role,
  active = true,
  must_change_password = false
from (
  values
    ('202c1000-0000-4000-8000-000000000101'::uuid, '20_2K_QA Superadmin', 'superadmin'),
    ('202c1000-0000-4000-8000-000000000102'::uuid, '20_2K_QA Director A', 'director'),
    ('202c1000-0000-4000-8000-000000000103'::uuid, '20_2K_QA Director B', 'director'),
    ('202c1000-0000-4000-8000-000000000104'::uuid, '20_2K_QA Tutor A', 'tutor'),
    ('202c1000-0000-4000-8000-000000000105'::uuid, '20_2K_QA Tutor B', 'tutor'),
    ('202c1000-0000-4000-8000-000000000106'::uuid, '20_2K_QA Family A', 'family'),
    ('202c1000-0000-4000-8000-000000000107'::uuid, '20_2K_QA Family B', 'family'),
    ('202c1000-0000-4000-8000-000000000108'::uuid, '20_2K_QA Inactive', 'tutor'),
    ('202c1000-0000-4000-8000-000000000109'::uuid, '20_2K_QA No Membership', 'director'),
    ('202c1000-0000-4000-8000-000000000110'::uuid, '20_2K_QA Unrelated Family', 'family'),
    ('202c1000-0000-4000-8000-000000000111'::uuid, '20_2K_QA Multischool Tutor', 'tutor')
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
    ('202c2000-0000-4000-8000-000000000201'::uuid, 'a', '202c1000-0000-4000-8000-000000000102'::uuid, 'director', true),
    ('202c2000-0000-4000-8000-000000000202'::uuid, 'b', '202c1000-0000-4000-8000-000000000103'::uuid, 'director', true),
    ('202c2000-0000-4000-8000-000000000203'::uuid, 'a', '202c1000-0000-4000-8000-000000000104'::uuid, 'tutor', true),
    ('202c2000-0000-4000-8000-000000000204'::uuid, 'b', '202c1000-0000-4000-8000-000000000105'::uuid, 'tutor', true),
    ('202c2000-0000-4000-8000-000000000205'::uuid, 'a', '202c1000-0000-4000-8000-000000000106'::uuid, 'family', true),
    ('202c2000-0000-4000-8000-000000000206'::uuid, 'b', '202c1000-0000-4000-8000-000000000107'::uuid, 'family', true),
    ('202c2000-0000-4000-8000-000000000207'::uuid, 'a', '202c1000-0000-4000-8000-000000000108'::uuid, 'tutor', false),
    ('202c2000-0000-4000-8000-000000000208'::uuid, 'a', '202c1000-0000-4000-8000-000000000110'::uuid, 'family', true),
    ('202c2000-0000-4000-8000-000000000209'::uuid, 'a', '202c1000-0000-4000-8000-000000000111'::uuid, 'tutor', true),
    ('202c2000-0000-4000-8000-000000000210'::uuid, 'b', '202c1000-0000-4000-8000-000000000111'::uuid, 'tutor', true)
) as fixture(id, slot, user_id, role, active)
join _20_2k_roots root on root.slot = fixture.slot;

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
    ('202c3000-0000-4000-8000-000000000301'::uuid, 'a', '202c1000-0000-4000-8000-000000000104'::uuid),
    ('202c3000-0000-4000-8000-000000000302'::uuid, 'b', '202c1000-0000-4000-8000-000000000105'::uuid),
    ('202c3000-0000-4000-8000-000000000303'::uuid, 'a', '202c1000-0000-4000-8000-000000000111'::uuid),
    ('202c3000-0000-4000-8000-000000000304'::uuid, 'b', '202c1000-0000-4000-8000-000000000111'::uuid)
) as fixture(id, slot, teacher_id)
join _20_2k_roots root on root.slot = fixture.slot;

insert into public.students (
  id, name, last_name, course_id, tutor_teacher_id, active,
  academic_year_id, school_id
)
select
  fixture.id,
  '20_2K_QA',
  fixture.last_name,
  root.course_id,
  fixture.tutor_id,
  true,
  root.academic_year_id,
  root.school_id
from (
  values
    ('202c4000-0000-4000-8000-000000000401'::uuid, 'a', 'Student A', '202c1000-0000-4000-8000-000000000104'::uuid),
    ('202c4000-0000-4000-8000-000000000402'::uuid, 'b', 'Student B', '202c1000-0000-4000-8000-000000000105'::uuid)
) as fixture(id, slot, last_name, tutor_id)
join _20_2k_roots root on root.slot = fixture.slot;

insert into public.parent_students (id, parent_id, student_id, school_id)
select
  fixture.id,
  fixture.parent_id,
  fixture.student_id,
  root.school_id
from (
  values
    ('202c5000-0000-4000-8000-000000000501'::uuid, 'a', '202c1000-0000-4000-8000-000000000106'::uuid, '202c4000-0000-4000-8000-000000000401'::uuid),
    ('202c5000-0000-4000-8000-000000000502'::uuid, 'b', '202c1000-0000-4000-8000-000000000107'::uuid, '202c4000-0000-4000-8000-000000000402'::uuid)
) as fixture(id, slot, parent_id, student_id)
join _20_2k_roots root on root.slot = fixture.slot;

-- Tutor A exercises all six grading/configuration ON CONFLICT targets.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000104', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into public.partial_grades (
  id, school_id, academic_year_id, student_id, teacher_id, subject_id,
  course_id, term, assessment_type, assessment_name, grade, visible_to_family
)
select
  '202c6000-0000-4000-8000-000000000601',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000401',
  '202c1000-0000-4000-8000-000000000104',
  root.subject_id,
  root.course_id,
  '1',
  'parcial',
  '20_2K_QA assessment',
  7,
  true
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term,
  assessment_type, assessment_name
) do update set grade = excluded.grade;

insert into public.evaluation_criteria (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term, name, weight, criterion_type, visible_to_family
)
select
  '202c6100-0000-4000-8000-000000000611',
  root.school_id,
  root.academic_year_id,
  '202c1000-0000-4000-8000-000000000104',
  root.course_id,
  root.subject_id,
  '1',
  '20_2K_QA criterion',
  100,
  'parcial',
  true
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id, term, name
) do update set weight = excluded.weight;

insert into public.quarter_final_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade
)
select
  '202c6200-0000-4000-8000-000000000621',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000401',
  root.subject_id,
  '202c1000-0000-4000-8000-000000000104',
  root.course_id,
  '1',
  7,
  7
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term
) do update set final_grade = excluded.final_grade;

insert into public.term_subject_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade, final_observation,
  status, closed_at
)
select
  '202c6300-0000-4000-8000-000000000631',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000401',
  root.subject_id,
  '202c1000-0000-4000-8000-000000000104',
  root.course_id,
  '1',
  7,
  7,
  '20_2K_QA observation',
  'closed',
  now()
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term
) do update set
  final_grade = excluded.final_grade,
  status = excluded.status,
  closed_at = excluded.closed_at;

insert into public.annual_evaluation_weights (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term1_weight, term2_weight, term3_weight
)
select
  '202c6400-0000-4000-8000-000000000641',
  root.school_id,
  root.academic_year_id,
  '202c1000-0000-4000-8000-000000000104',
  root.course_id,
  root.subject_id,
  33,
  33,
  34
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id
) do update set term3_weight = excluded.term3_weight;

insert into public.final_course_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term1_weight, term2_weight, term3_weight, final_grade,
  final_observation, status, closed_at
)
select
  '202c6500-0000-4000-8000-000000000651',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000401',
  root.subject_id,
  '202c1000-0000-4000-8000-000000000104',
  root.course_id,
  33,
  33,
  34,
  7,
  '20_2K_QA final observation',
  'closed',
  now()
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id
) do update set
  final_grade = excluded.final_grade,
  status = excluded.status,
  closed_at = excluded.closed_at;

do $tutor_a_checks$
begin
  if (select count(*) from public.partial_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 1
     or (select count(*) from public.evaluation_criteria where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 1
     or (select count(*) from public.quarter_final_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 1
     or (select count(*) from public.term_subject_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 1
     or (select count(*) from public.annual_evaluation_weights where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 1
     or (select count(*) from public.final_course_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 1 then
    raise exception '20.2K Tutor A did not write exactly one scoped row per target.';
  end if;

  begin
    insert into public.partial_grades (
      school_id, academic_year_id, student_id, teacher_id, subject_id,
      course_id, term, assessment_type, assessment_name, grade
    )
    select
      root.school_id,
      root.academic_year_id,
      '202c4000-0000-4000-8000-000000000402',
      '202c1000-0000-4000-8000-000000000104',
      root.subject_id,
      root.course_id,
      '1',
      'parcial',
      '20_2K_QA forbidden cross-tenant',
      5
    from _20_2k_roots root
    where root.slot = 'b';
    raise exception '20.2K cross-tenant tutor write unexpectedly succeeded.';
  exception
    when insufficient_privilege or foreign_key_violation or check_violation then
      null;
  end;
end
$tutor_a_checks$;
reset role;

-- Tutor B creates equivalent rows in the second tenant.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000105', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into public.partial_grades (
  id, school_id, academic_year_id, student_id, teacher_id, subject_id,
  course_id, term, assessment_type, assessment_name, grade, visible_to_family
)
select
  '202c6000-0000-4000-8000-000000000602',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000402',
  '202c1000-0000-4000-8000-000000000105',
  root.subject_id,
  root.course_id,
  '1',
  'parcial',
  '20_2K_QA assessment',
  8,
  true
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term,
  assessment_type, assessment_name
) do update set grade = excluded.grade;

insert into public.evaluation_criteria (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term, name, weight, criterion_type, visible_to_family
)
select
  '202c6100-0000-4000-8000-000000000612',
  root.school_id,
  root.academic_year_id,
  '202c1000-0000-4000-8000-000000000105',
  root.course_id,
  root.subject_id,
  '1',
  '20_2K_QA criterion',
  100,
  'parcial',
  true
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id, term, name
) do update set weight = excluded.weight;

insert into public.quarter_final_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade
)
select
  '202c6200-0000-4000-8000-000000000622',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000402',
  root.subject_id,
  '202c1000-0000-4000-8000-000000000105',
  root.course_id,
  '1',
  8,
  8
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term
) do update set final_grade = excluded.final_grade;

insert into public.term_subject_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade, status, closed_at
)
select
  '202c6300-0000-4000-8000-000000000632',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000402',
  root.subject_id,
  '202c1000-0000-4000-8000-000000000105',
  root.course_id,
  '1',
  8,
  8,
  'closed',
  now()
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term
) do update set final_grade = excluded.final_grade;

insert into public.annual_evaluation_weights (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term1_weight, term2_weight, term3_weight
)
select
  '202c6400-0000-4000-8000-000000000642',
  root.school_id,
  root.academic_year_id,
  '202c1000-0000-4000-8000-000000000105',
  root.course_id,
  root.subject_id,
  33,
  33,
  34
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id
) do update set term3_weight = excluded.term3_weight;

insert into public.final_course_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term1_weight, term2_weight, term3_weight, final_grade,
  status, closed_at
)
select
  '202c6500-0000-4000-8000-000000000652',
  root.school_id,
  root.academic_year_id,
  '202c4000-0000-4000-8000-000000000402',
  root.subject_id,
  '202c1000-0000-4000-8000-000000000105',
  root.course_id,
  33,
  33,
  34,
  8,
  'closed',
  now()
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id
) do update set final_grade = excluded.final_grade;

do $tutor_b_checks$
begin
  if (select count(*) from public.partial_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 1
     or (select count(*) from public.evaluation_criteria where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 1
     or (select count(*) from public.quarter_final_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 1
     or (select count(*) from public.term_subject_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 1
     or (select count(*) from public.annual_evaluation_weights where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 1
     or (select count(*) from public.final_course_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 1 then
    raise exception '20.2K Tutor B did not write exactly one scoped row per target.';
  end if;
end
$tutor_b_checks$;
reset role;

-- Directors exercise both publication ON CONFLICT targets.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000102', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into public.evaluation_publications (
  id, school_id, academic_year_id, course_id, term, published,
  published_at, published_by
)
select
  '202c6600-0000-4000-8000-000000000661',
  root.school_id,
  root.academic_year_id,
  root.course_id,
  '1',
  true,
  now(),
  '202c1000-0000-4000-8000-000000000102'
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, course_id, term
) do update set
  published = excluded.published,
  published_at = excluded.published_at,
  published_by = excluded.published_by;

insert into public.final_evaluation_publications (
  id, school_id, academic_year_id, course_id, published,
  published_at, published_by
)
select
  '202c6700-0000-4000-8000-000000000671',
  root.school_id,
  root.academic_year_id,
  root.course_id,
  true,
  now(),
  '202c1000-0000-4000-8000-000000000102'
from _20_2k_roots root
where root.slot = 'a'
on conflict (
  school_id, academic_year_id, course_id
) do update set
  published = excluded.published,
  published_at = excluded.published_at,
  published_by = excluded.published_by;

do $director_a_checks$
begin
  if exists (
    select 1 from public.partial_grades
    where school_id = (select school_id from _20_2k_roots where slot = 'b')
  ) then
    raise exception '20.2K Director A can read tenant B.';
  end if;
end
$director_a_checks$;
reset role;

select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000103', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into public.evaluation_publications (
  id, school_id, academic_year_id, course_id, term, published
)
select
  '202c6600-0000-4000-8000-000000000662',
  root.school_id,
  root.academic_year_id,
  root.course_id,
  '1',
  false
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, course_id, term
) do update set published = excluded.published;

insert into public.final_evaluation_publications (
  id, school_id, academic_year_id, course_id, published
)
select
  '202c6700-0000-4000-8000-000000000672',
  root.school_id,
  root.academic_year_id,
  root.course_id,
  false
from _20_2k_roots root
where root.slot = 'b'
on conflict (
  school_id, academic_year_id, course_id
) do update set published = excluded.published;
reset role;

-- Re-run every canonical conflict target in A, then B. Each pass must update
-- only its own tenant row and preserve the peer tenant unchanged.
insert into public.partial_grades (
  id, school_id, academic_year_id, student_id, teacher_id, subject_id,
  course_id, term, assessment_type, assessment_name, grade, visible_to_family
)
select
  '202c6000-0000-4000-8000-000000000601', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000401',
  '202c1000-0000-4000-8000-000000000104', root.subject_id,
  root.course_id, '1', 'parcial', '20_2K_QA assessment', 7.25, true
from _20_2k_roots root where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term,
  assessment_type, assessment_name
) do update set grade = excluded.grade;

insert into public.evaluation_criteria (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term, name, weight, criterion_type, visible_to_family
)
select
  '202c6100-0000-4000-8000-000000000611', root.school_id,
  root.academic_year_id, '202c1000-0000-4000-8000-000000000104',
  root.course_id, root.subject_id, '1', '20_2K_QA criterion', 99,
  'parcial', true
from _20_2k_roots root where root.slot = 'a'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id, term, name
) do update set weight = excluded.weight;

insert into public.quarter_final_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade
)
select
  '202c6200-0000-4000-8000-000000000621', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000401',
  root.subject_id, '202c1000-0000-4000-8000-000000000104',
  root.course_id, '1', 7.25, 7.25
from _20_2k_roots root where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term
) do update set calculated_grade = excluded.calculated_grade,
                final_grade = excluded.final_grade;

insert into public.term_subject_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade, final_observation,
  status, closed_at
)
select
  '202c6300-0000-4000-8000-000000000631', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000401',
  root.subject_id, '202c1000-0000-4000-8000-000000000104',
  root.course_id, '1', 7, 6, '20_2K_QA observation A',
  'closed', now()
from _20_2k_roots root where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term
) do update set final_grade = excluded.final_grade,
                final_observation = excluded.final_observation;

insert into public.annual_evaluation_weights (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term1_weight, term2_weight, term3_weight
)
select
  '202c6400-0000-4000-8000-000000000641', root.school_id,
  root.academic_year_id, '202c1000-0000-4000-8000-000000000104',
  root.course_id, root.subject_id, 32, 34, 34
from _20_2k_roots root where root.slot = 'a'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id
) do update set term1_weight = excluded.term1_weight,
                term2_weight = excluded.term2_weight,
                term3_weight = excluded.term3_weight;

insert into public.final_course_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term1_weight, term2_weight, term3_weight, final_grade,
  final_observation, status, closed_at
)
select
  '202c6500-0000-4000-8000-000000000651', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000401',
  root.subject_id, '202c1000-0000-4000-8000-000000000104',
  root.course_id, 32, 34, 34, 6, '20_2K_QA final A',
  'closed', now()
from _20_2k_roots root where root.slot = 'a'
on conflict (
  school_id, academic_year_id, student_id, subject_id
) do update set final_grade = excluded.final_grade,
                final_observation = excluded.final_observation;

insert into public.evaluation_publications (
  id, school_id, academic_year_id, course_id, term, published,
  published_at, published_by
)
select
  '202c6600-0000-4000-8000-000000000661', root.school_id,
  root.academic_year_id, root.course_id, '1', true, now(),
  '202c1000-0000-4000-8000-000000000102'
from _20_2k_roots root where root.slot = 'a'
on conflict (school_id, academic_year_id, course_id, term)
do update set published = excluded.published,
              published_at = excluded.published_at;

insert into public.final_evaluation_publications (
  id, school_id, academic_year_id, course_id, published,
  published_at, published_by
)
select
  '202c6700-0000-4000-8000-000000000671', root.school_id,
  root.academic_year_id, root.course_id, true, now(),
  '202c1000-0000-4000-8000-000000000102'
from _20_2k_roots root where root.slot = 'a'
on conflict (school_id, academic_year_id, course_id)
do update set published = excluded.published,
              published_at = excluded.published_at;

do $tenant_a_upsert_isolation$
begin
  if (select grade from public.partial_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 8
     or (select weight from public.evaluation_criteria where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 100
     or (select final_grade from public.quarter_final_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 8
     or (select final_grade from public.term_subject_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 8
     or (select term1_weight from public.annual_evaluation_weights where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 33
     or (select final_grade from public.final_course_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 8
     or (select published from public.evaluation_publications where school_id = (select school_id from _20_2k_roots where slot = 'b'))
     or (select published from public.final_evaluation_publications where school_id = (select school_id from _20_2k_roots where slot = 'b')) then
    raise exception '20.2K tenant A upsert changed tenant B.';
  end if;
end
$tenant_a_upsert_isolation$;

insert into public.partial_grades (
  id, school_id, academic_year_id, student_id, teacher_id, subject_id,
  course_id, term, assessment_type, assessment_name, grade, visible_to_family
)
select
  '202c6000-0000-4000-8000-000000000602', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000402',
  '202c1000-0000-4000-8000-000000000105', root.subject_id,
  root.course_id, '1', 'parcial', '20_2K_QA assessment', 8.25, true
from _20_2k_roots root where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term,
  assessment_type, assessment_name
) do update set grade = excluded.grade;

insert into public.evaluation_criteria (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term, name, weight, criterion_type, visible_to_family
)
select
  '202c6100-0000-4000-8000-000000000612', root.school_id,
  root.academic_year_id, '202c1000-0000-4000-8000-000000000105',
  root.course_id, root.subject_id, '1', '20_2K_QA criterion', 98,
  'parcial', true
from _20_2k_roots root where root.slot = 'b'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id, term, name
) do update set weight = excluded.weight;

insert into public.quarter_final_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade
)
select
  '202c6200-0000-4000-8000-000000000622', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000402',
  root.subject_id, '202c1000-0000-4000-8000-000000000105',
  root.course_id, '1', 8.25, 8.25
from _20_2k_roots root where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term
) do update set calculated_grade = excluded.calculated_grade,
                final_grade = excluded.final_grade;

insert into public.term_subject_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term, calculated_grade, final_grade, final_observation,
  status, closed_at
)
select
  '202c6300-0000-4000-8000-000000000632', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000402',
  root.subject_id, '202c1000-0000-4000-8000-000000000105',
  root.course_id, '1', 8, 9, '20_2K_QA observation B',
  'closed', now()
from _20_2k_roots root where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id, term
) do update set final_grade = excluded.final_grade,
                final_observation = excluded.final_observation;

insert into public.annual_evaluation_weights (
  id, school_id, academic_year_id, teacher_id, course_id, subject_id,
  term1_weight, term2_weight, term3_weight
)
select
  '202c6400-0000-4000-8000-000000000642', root.school_id,
  root.academic_year_id, '202c1000-0000-4000-8000-000000000105',
  root.course_id, root.subject_id, 31, 34, 35
from _20_2k_roots root where root.slot = 'b'
on conflict (
  school_id, academic_year_id, teacher_id, course_id, subject_id
) do update set term1_weight = excluded.term1_weight,
                term2_weight = excluded.term2_weight,
                term3_weight = excluded.term3_weight;

insert into public.final_course_grades (
  id, school_id, academic_year_id, student_id, subject_id, teacher_id,
  course_id, term1_weight, term2_weight, term3_weight, final_grade,
  final_observation, status, closed_at
)
select
  '202c6500-0000-4000-8000-000000000652', root.school_id,
  root.academic_year_id, '202c4000-0000-4000-8000-000000000402',
  root.subject_id, '202c1000-0000-4000-8000-000000000105',
  root.course_id, 31, 34, 35, 9, '20_2K_QA final B',
  'closed', now()
from _20_2k_roots root where root.slot = 'b'
on conflict (
  school_id, academic_year_id, student_id, subject_id
) do update set final_grade = excluded.final_grade,
                final_observation = excluded.final_observation;

insert into public.evaluation_publications (
  id, school_id, academic_year_id, course_id, term, published
)
select
  '202c6600-0000-4000-8000-000000000662', root.school_id,
  root.academic_year_id, root.course_id, '1', false
from _20_2k_roots root where root.slot = 'b'
on conflict (school_id, academic_year_id, course_id, term)
do update set published = excluded.published;

insert into public.final_evaluation_publications (
  id, school_id, academic_year_id, course_id, published
)
select
  '202c6700-0000-4000-8000-000000000672', root.school_id,
  root.academic_year_id, root.course_id, false
from _20_2k_roots root where root.slot = 'b'
on conflict (school_id, academic_year_id, course_id)
do update set published = excluded.published;

do $tenant_b_upsert_isolation$
begin
  if (select grade from public.partial_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 7.25
     or (select weight from public.evaluation_criteria where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 99
     or (select final_grade from public.quarter_final_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 7.25
     or (select final_grade from public.term_subject_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 6
     or (select term1_weight from public.annual_evaluation_weights where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 32
     or (select final_grade from public.final_course_grades where school_id = (select school_id from _20_2k_roots where slot = 'a')) <> 6
     or not (select published from public.evaluation_publications where school_id = (select school_id from _20_2k_roots where slot = 'a'))
     or not (select published from public.final_evaluation_publications where school_id = (select school_id from _20_2k_roots where slot = 'a'))
     or (select count(*) from public.partial_grades where assessment_name = '20_2K_QA assessment') <> 2
     or (select count(*) from public.evaluation_criteria where name = '20_2K_QA criterion') <> 2
     or (select final_grade from public.term_subject_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 9
     or (select final_grade from public.final_course_grades where school_id = (select school_id from _20_2k_roots where slot = 'b')) <> 9 then
    raise exception '20.2K tenant B isolation failed: %', (
      select jsonb_build_object(
        'a_partial', (select grade from public.partial_grades where school_id = root.school_id),
        'a_criterion', (select weight from public.evaluation_criteria where school_id = root.school_id),
        'a_quarter', (select final_grade from public.quarter_final_grades where school_id = root.school_id),
        'a_term', (select final_grade from public.term_subject_grades where school_id = root.school_id),
        'a_weight', (select term1_weight from public.annual_evaluation_weights where school_id = root.school_id),
        'a_final', (select final_grade from public.final_course_grades where school_id = root.school_id),
        'a_term_published', (select published from public.evaluation_publications where school_id = root.school_id),
        'a_final_published', (select published from public.final_evaluation_publications where school_id = root.school_id),
        'partial_count', (select count(*) from public.partial_grades where assessment_name = '20_2K_QA assessment'),
        'criteria_count', (select count(*) from public.evaluation_criteria where name = '20_2K_QA criterion')
      )
      from _20_2k_roots root
      where root.slot = 'a'
    );
  end if;
end
$tenant_b_upsert_isolation$;

-- Family A sees visible/published A rows only.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000106', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $family_a_checks$
begin
  if (select count(*) from public.partial_grades) <> 1
     or (select count(*) from public.term_subject_grades) <> 1
     or (select count(*) from public.final_course_grades) <> 1 then
    raise exception '20.2K Family A visibility is not scoped to its published student.';
  end if;
end
$family_a_checks$;
reset role;

-- Family B sees its visible partial grade, but unpublished term/final rows stay hidden.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000107', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $family_b_checks$
begin
  if (select count(*) from public.partial_grades) <> 1
     or exists (select 1 from public.term_subject_grades)
     or exists (select 1 from public.final_course_grades) then
    raise exception '20.2K Family B publication boundary failed.';
  end if;
end
$family_b_checks$;
reset role;

-- Inactive membership and no membership receive no rows.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000108', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $inactive_checks$
begin
  if exists (select 1 from public.partial_grades)
     or exists (select 1 from public.term_subject_grades) then
    raise exception '20.2K inactive membership received academic rows.';
  end if;
end
$inactive_checks$;
reset role;

select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000109', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $no_membership_checks$
begin
  if exists (select 1 from public.partial_grades)
     or exists (select 1 from public.evaluation_publications) then
    raise exception '20.2K user without membership received academic rows.';
  end if;
end
$no_membership_checks$;
reset role;

-- Correct family role without a relation receives no rows.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000110', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $unrelated_family_checks$
begin
  if exists (select 1 from public.partial_grades)
     or exists (select 1 from public.term_subject_grades)
     or exists (select 1 from public.final_course_grades) then
    raise exception '20.2K unrelated family received academic rows.';
  end if;
end
$unrelated_family_checks$;
reset role;

-- Multischool RLS may authorize both memberships, while explicit application
-- filters must select exactly one ActiveSchoolContext.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

insert into public.partial_grades (
  id, school_id, academic_year_id, student_id, teacher_id, subject_id,
  course_id, term, assessment_type, assessment_name, grade, visible_to_family
)
select
  case
    when root.slot = 'a' then '202c6000-0000-4000-8000-000000000603'::uuid
    else '202c6000-0000-4000-8000-000000000604'::uuid
  end,
  root.school_id,
  root.academic_year_id,
  case
    when root.slot = 'a' then '202c4000-0000-4000-8000-000000000401'::uuid
    else '202c4000-0000-4000-8000-000000000402'::uuid
  end,
  '202c1000-0000-4000-8000-000000000111',
  root.subject_id,
  root.course_id,
  '2',
  'parcial',
  '20_2K_QA multischool assessment',
  6,
  false
from _20_2k_roots root
on conflict (
  school_id, academic_year_id, student_id, subject_id, term,
  assessment_type, assessment_name
) do update set grade = excluded.grade;

do $multischool_checks$
begin
  if (
    select count(*)
    from public.partial_grades
    where school_id = (select school_id from _20_2k_roots where slot = 'a')
      and academic_year_id = (select academic_year_id from _20_2k_roots where slot = 'a')
      and teacher_id = auth.uid()
  ) <> 1 then
    raise exception '20.2K explicit multischool context A did not resolve one row.';
  end if;

  if (
    select count(*)
    from public.partial_grades
    where school_id = (select school_id from _20_2k_roots where slot = 'b')
      and academic_year_id = (select academic_year_id from _20_2k_roots where slot = 'b')
      and teacher_id = auth.uid()
  ) <> 1 then
    raise exception '20.2K explicit multischool context B did not resolve one row.';
  end if;
end
$multischool_checks$;
reset role;

-- Global superadmin can audit both tenants at the database layer. The
-- application still requires an explicit selected center before operational reads.
select set_config('request.jwt.claim.sub', '202c1000-0000-4000-8000-000000000101', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $superadmin_checks$
begin
  if (select count(*) from public.partial_grades) <> 4 then
    raise exception '20.2K superadmin audit visibility did not include both active tenants.';
  end if;
end
$superadmin_checks$;
reset role;

-- Structural negative: contradictory tenant roots must fail independently of RLS.
do $cross_tenant_root_checks$
begin
  begin
    insert into public.partial_grades (
      school_id, academic_year_id, student_id, teacher_id, subject_id,
      course_id, term, assessment_type, assessment_name, grade
    )
    select
      root_a.school_id, root_a.academic_year_id,
      '202c4000-0000-4000-8000-000000000402',
      '202c1000-0000-4000-8000-000000000105',
      root_b.subject_id, root_b.course_id, '3', 'parcial',
      '20_2K_QA structural cross', 5
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K cross-tenant partial grade unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;

  begin
    insert into public.evaluation_criteria (
      school_id, academic_year_id, teacher_id, course_id, subject_id,
      term, name, weight, criterion_type
    )
    select
      root_a.school_id, root_a.academic_year_id,
      '202c1000-0000-4000-8000-000000000105',
      root_b.course_id, root_b.subject_id, '3',
      '20_2K_QA structural cross', 100, 'parcial'
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K cross-tenant criterion unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;

  begin
    insert into public.quarter_final_grades (
      school_id, academic_year_id, student_id, subject_id, teacher_id,
      course_id, term, calculated_grade, final_grade
    )
    select
      root_a.school_id, root_a.academic_year_id,
      '202c4000-0000-4000-8000-000000000402', root_b.subject_id,
      '202c1000-0000-4000-8000-000000000105', root_b.course_id,
      '3', 5, 5
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K cross-tenant quarter grade unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;

  begin
    insert into public.term_subject_grades (
      school_id, academic_year_id, student_id, subject_id, teacher_id,
      course_id, term, calculated_grade, final_grade, status
    )
    select
      root_a.school_id, root_a.academic_year_id,
      '202c4000-0000-4000-8000-000000000402', root_b.subject_id,
      '202c1000-0000-4000-8000-000000000105', root_b.course_id,
      '3', 5, 5, 'draft'
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K cross-tenant term grade unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;

  begin
    insert into public.annual_evaluation_weights (
      school_id, academic_year_id, teacher_id, course_id, subject_id,
      term1_weight, term2_weight, term3_weight
    )
    select
      root_a.school_id, root_a.academic_year_id,
      '202c1000-0000-4000-8000-000000000105',
      root_b.course_id, root_b.subject_id, 33, 33, 34
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K cross-tenant annual weights unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;

  begin
    insert into public.final_course_grades (
      school_id, academic_year_id, student_id, subject_id, teacher_id,
      course_id, term1_weight, term2_weight, term3_weight, final_grade, status
    )
    select
      root_a.school_id, root_a.academic_year_id,
      '202c4000-0000-4000-8000-000000000402', root_b.subject_id,
      '202c1000-0000-4000-8000-000000000105', root_b.course_id,
      33, 33, 34, 5, 'draft'
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K cross-tenant final grade unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;

  begin
    insert into public.evaluation_publications (
      school_id, academic_year_id, course_id, term, published
    )
    select
      root_a.school_id,
      root_a.academic_year_id,
      root_b.course_id,
      '2',
      false
    from _20_2k_roots root_a
    cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K contradictory publication roots unexpectedly succeeded.';
  exception
    when foreign_key_violation or check_violation then
      null;
  end;

  begin
    insert into public.final_evaluation_publications (
      school_id, academic_year_id, course_id, published
    )
    select
      root_a.school_id, root_a.academic_year_id, root_b.course_id, false
    from _20_2k_roots root_a cross join _20_2k_roots root_b
    where root_a.slot = 'a' and root_b.slot = 'b';
    raise exception '20.2K contradictory final publication roots unexpectedly succeeded.';
  exception when foreign_key_violation or check_violation then null;
  end;
end
$cross_tenant_root_checks$;

select '20.2K application and tenant-aware ON CONFLICT checks passed' as result;

rollback;
