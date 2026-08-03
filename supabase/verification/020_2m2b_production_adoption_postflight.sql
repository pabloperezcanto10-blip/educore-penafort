-- Sprint 20.2M2B - production adoption postflight.
-- STRICTLY READ ONLY: aggregate counters only, no PII.
-- Run on the restored clone after 034, 035-PROD, 036-PROD and 037-041.

with metrics as (
  select 'tenant'::text as category, 'schools'::text as metric,
    count(*)::bigint as total, 'must_be_1'::text as expectation
  from public.schools

  union all select 'tenant', 'active_penafort_school', count(*)::bigint, 'must_be_1'
  from public.schools
  where id = '20f20000-0000-4000-8000-000000000001'
    and slug = 'colegio-penafort'
    and active = true
    and status = 'active'

  union all select 'tenant', 'active_memberships', count(*)::bigint, 'must_be_4'
  from public.school_memberships
  where school_id = '20f20000-0000-4000-8000-000000000001'
    and active = true

  union all select 'tenant', 'membership_role_mismatches', count(*)::bigint, 'must_be_0'
  from public.school_memberships membership
  join public.profiles profile on profile.id = membership.user_id
  where membership.school_id = '20f20000-0000-4000-8000-000000000001'
    and membership.role is distinct from profile.role

  union all select 'tenant', 'school_id_columns', count(*)::bigint, 'must_be_19'
  from information_schema.columns
  where table_schema = 'public' and column_name = 'school_id'

  union all select 'identity', 'auth_users', count(*)::bigint, 'must_be_4'
  from auth.users
  union all select 'identity', 'profiles', count(*)::bigint, 'must_be_4'
  from public.profiles
  union all select 'identity', 'auth_users_without_profile', count(*)::bigint, 'must_be_0'
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where profile.id is null

  union all select 'preservation', 'academic_years', count(*)::bigint, 'must_be_1'
  from public.academic_years
  union all select 'preservation', 'courses', count(*)::bigint, 'must_be_12'
  from public.courses
  union all select 'preservation', 'subjects', count(*)::bigint, 'must_be_18'
  from public.subjects
  union all select 'preservation', 'course_subjects', count(*)::bigint, 'must_be_102'
  from public.course_subjects
  union all select 'preservation', 'students', count(*)::bigint, 'must_be_1'
  from public.students
  union all select 'preservation', 'parent_students', count(*)::bigint, 'must_be_1'
  from public.parent_students
  union all select 'preservation', 'teacher_assignments', count(*)::bigint, 'must_be_9'
  from public.teacher_assignments
  union all select 'preservation', 'evaluation_criteria', count(*)::bigint, 'must_be_14'
  from public.evaluation_criteria
  union all select 'preservation', 'partial_grades', count(*)::bigint, 'must_be_17'
  from public.partial_grades
  union all select 'preservation', 'term_subject_grades', count(*)::bigint, 'must_be_2'
  from public.term_subject_grades

  union all select 'integrity', 'configuration_null_school_id', sum(total)::bigint, 'must_be_0'
  from (
    select count(*)::bigint as total from public.academic_years where school_id is null
    union all select count(*) from public.courses where school_id is null
    union all select count(*) from public.subjects where school_id is null
    union all select count(*) from public.course_subjects where school_id is null
  ) rows

  union all select 'integrity', 'people_null_school_id', sum(total)::bigint, 'must_be_0'
  from (
    select count(*)::bigint as total from public.students where school_id is null
    union all select count(*) from public.families where school_id is null
    union all select count(*) from public.student_families where school_id is null
    union all select count(*) from public.parent_students where school_id is null
    union all select count(*) from public.teachers where school_id is null
    union all select count(*) from public.teacher_assignments where school_id is null
  ) rows

  union all select 'integrity', 'academic_null_school_id', sum(total)::bigint, 'must_be_0'
  from (
    select count(*)::bigint as total from public.partial_grades where school_id is null
    union all select count(*) from public.evaluation_criteria where school_id is null
    union all select count(*) from public.quarter_final_grades where school_id is null
    union all select count(*) from public.term_subject_grades where school_id is null
    union all select count(*) from public.evaluation_publications where school_id is null
    union all select count(*) from public.annual_evaluation_weights where school_id is null
    union all select count(*) from public.final_course_grades where school_id is null
    union all select count(*) from public.final_evaluation_publications where school_id is null
  ) rows

  union all select 'integrity', 'configuration_cross_school', count(*)::bigint, 'must_be_0'
  from public.course_subjects relation
  join public.courses course on course.id = relation.course_id
  join public.subjects subject on subject.id = relation.subject_id
  join public.academic_years academic_year on academic_year.id = relation.academic_year_id
  where relation.school_id is distinct from course.school_id
     or relation.school_id is distinct from subject.school_id
     or relation.school_id is distinct from academic_year.school_id

  union all select 'integrity', 'students_cross_school', count(*)::bigint, 'must_be_0'
  from public.students student
  join public.courses course on course.id = student.course_id
  join public.academic_years academic_year on academic_year.id = student.academic_year_id
  where student.school_id is distinct from course.school_id
     or student.school_id is distinct from academic_year.school_id

  union all select 'integrity', 'parent_students_cross_school', count(*)::bigint, 'must_be_0'
  from public.parent_students relation
  join public.students student on student.id = relation.student_id
  where relation.school_id is distinct from student.school_id

  union all select 'integrity', 'teacher_assignments_cross_school', count(*)::bigint, 'must_be_0'
  from public.teacher_assignments assignment
  join public.courses course on course.id = assignment.course_id
  join public.subjects subject on subject.id = assignment.subject_id
  join public.academic_years academic_year on academic_year.id = assignment.academic_year_id
  where assignment.school_id is distinct from course.school_id
     or assignment.school_id is distinct from subject.school_id
     or assignment.school_id is distinct from academic_year.school_id

  union all select 'integrity', 'academic_rows_outside_penafort', sum(total)::bigint, 'must_be_0'
  from (
    select count(*)::bigint as total from public.partial_grades
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.evaluation_criteria
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.quarter_final_grades
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.term_subject_grades
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.evaluation_publications
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.annual_evaluation_weights
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.final_course_grades
      where school_id <> '20f20000-0000-4000-8000-000000000001'
    union all select count(*) from public.final_evaluation_publications
      where school_id <> '20f20000-0000-4000-8000-000000000001'
  ) rows

  union all select 'security', 'public_tables_with_rls_disabled', count(*)::bigint, 'must_be_0'
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and relation.relrowsecurity is false

  union all select 'schema', 'legacy_academic_unique_objects_present', count(*)::bigint, 'must_be_0'
  from (
    select indexname as object_name
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'partial_grades_unique_assessment_year_idx'
      )
    union all
    select constraint_row.conname
    from pg_constraint constraint_row
    join pg_namespace namespace on namespace.oid = constraint_row.connamespace
    where namespace.nspname = 'public'
      and constraint_row.conname in (
        'evaluation_criteria_unique_name_year',
        'term_subject_grades_unique_student_subject_term_year',
        'evaluation_publications_unique_course_term_year',
        'quarter_final_grades_unique_student_term_year',
        'annual_weights_unique_year',
        'final_course_grades_unique_year',
        'final_evaluation_publications_unique_course_year'
      )
  ) legacy_objects
)
select category, metric, total, expectation
from metrics
order by category, metric;
