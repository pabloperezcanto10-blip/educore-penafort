-- SPRINT 20.2L2 exact synthetic-fixture residue audit
-- SELECT ONLY. Expected result: total_residue = 0.

with fixture_users as (
  select id
  from auth.users
  where id between
      '202c1000-0000-4000-8000-000000000101'::uuid and
      '202c1000-0000-4000-8000-000000000111'::uuid
     or email like '20_2k_qa.%@example.test'
), residue as (
  select 'auth.users' as object_name, count(*)::bigint as row_count
  from fixture_users
  union all
  select 'auth.sessions', count(*) from auth.sessions
  where user_id in (select id from fixture_users)
  union all
  select 'profiles', count(*) from public.profiles
  where id between
      '202c1000-0000-4000-8000-000000000101'::uuid and
      '202c1000-0000-4000-8000-000000000111'::uuid
     or full_name like '20_2K_QA%'
  union all
  select 'school_memberships', count(*) from public.school_memberships
  where id between
      '202c2000-0000-4000-8000-000000000201'::uuid and
      '202c2000-0000-4000-8000-000000000210'::uuid
  union all
  select 'teacher_assignments', count(*) from public.teacher_assignments
  where id between
      '202c3000-0000-4000-8000-000000000301'::uuid and
      '202c3000-0000-4000-8000-000000000304'::uuid
  union all
  select 'students', count(*) from public.students
  where id between
      '202c4000-0000-4000-8000-000000000401'::uuid and
      '202c4000-0000-4000-8000-000000000402'::uuid
     or name = '20_2K_QA'
  union all
  select 'parent_students', count(*) from public.parent_students
  where id between
      '202c5000-0000-4000-8000-000000000501'::uuid and
      '202c5000-0000-4000-8000-000000000502'::uuid
  union all
  select 'partial_grades', count(*) from public.partial_grades
  where id between
      '202c6000-0000-4000-8000-000000000601'::uuid and
      '202c6000-0000-4000-8000-000000000604'::uuid
  union all
  select 'evaluation_criteria', count(*) from public.evaluation_criteria
  where id between
      '202c6100-0000-4000-8000-000000000611'::uuid and
      '202c6100-0000-4000-8000-000000000612'::uuid
  union all
  select 'quarter_final_grades', count(*) from public.quarter_final_grades
  where id between
      '202c6200-0000-4000-8000-000000000621'::uuid and
      '202c6200-0000-4000-8000-000000000622'::uuid
  union all
  select 'term_subject_grades', count(*) from public.term_subject_grades
  where id between
      '202c6300-0000-4000-8000-000000000631'::uuid and
      '202c6300-0000-4000-8000-000000000632'::uuid
  union all
  select 'annual_evaluation_weights', count(*) from public.annual_evaluation_weights
  where id between
      '202c6400-0000-4000-8000-000000000641'::uuid and
      '202c6400-0000-4000-8000-000000000642'::uuid
  union all
  select 'final_course_grades', count(*) from public.final_course_grades
  where id between
      '202c6500-0000-4000-8000-000000000651'::uuid and
      '202c6500-0000-4000-8000-000000000652'::uuid
  union all
  select 'evaluation_publications', count(*) from public.evaluation_publications
  where id between
      '202c6600-0000-4000-8000-000000000661'::uuid and
      '202c6600-0000-4000-8000-000000000662'::uuid
  union all
  select 'final_evaluation_publications', count(*) from public.final_evaluation_publications
  where id between
      '202c6700-0000-4000-8000-000000000671'::uuid and
      '202c6700-0000-4000-8000-000000000672'::uuid
)
select
  coalesce(sum(row_count), 0) as total_residue,
  jsonb_object_agg(object_name, row_count order by object_name) as by_object,
  coalesce(sum(row_count), 0) = 0 as clean
from residue;
