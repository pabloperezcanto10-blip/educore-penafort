-- Sprint 20.2M2B - production adoption preflight.
-- STRICTLY READ ONLY: aggregate counters only, no PII.
-- Run on the restored clone before baseline reconciliation and migration 034.

with metrics as (
  select 'identity'::text as category, 'auth_users'::text as metric,
    count(*)::bigint as total, 'must_be_4'::text as expectation
  from auth.users

  union all select 'identity', 'profiles', count(*)::bigint, 'must_be_4'
  from public.profiles

  union all select 'identity', 'auth_users_without_profile', count(*)::bigint, 'must_be_0'
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  where profile.id is null

  union all select 'identity', 'profiles_without_auth_user', count(*)::bigint, 'must_be_0'
  from public.profiles profile
  left join auth.users auth_user on auth_user.id = profile.id
  where auth_user.id is null

  union all select 'identity', 'inactive_profiles', count(*)::bigint, 'must_be_0'
  from public.profiles where active is not true

  union all select 'identity', 'superadmin_profiles', count(*)::bigint, 'must_be_1'
  from public.profiles where role = 'superadmin' and active

  union all select 'identity', 'director_profiles', count(*)::bigint, 'must_be_1'
  from public.profiles where role = 'director' and active

  union all select 'identity', 'tutor_profiles', count(*)::bigint, 'must_be_1'
  from public.profiles where role = 'tutor' and active

  union all select 'identity', 'family_profiles', count(*)::bigint, 'must_be_1'
  from public.profiles where role = 'family' and active

  union all select 'inventory', 'academic_years', count(*)::bigint, 'must_be_1'
  from public.academic_years
  union all select 'inventory', 'active_academic_years', count(*)::bigint, 'must_be_1'
  from public.academic_years where active
  union all select 'inventory', 'courses', count(*)::bigint, 'must_be_12'
  from public.courses
  union all select 'inventory', 'subjects', count(*)::bigint, 'must_be_18'
  from public.subjects
  union all select 'inventory', 'course_subjects', count(*)::bigint, 'must_be_102'
  from public.course_subjects
  union all select 'inventory', 'students', count(*)::bigint, 'must_be_1'
  from public.students
  union all select 'inventory', 'parent_students', count(*)::bigint, 'must_be_1'
  from public.parent_students
  union all select 'inventory', 'teacher_assignments', count(*)::bigint, 'must_be_9'
  from public.teacher_assignments
  union all select 'inventory', 'families_legacy', count(*)::bigint, 'must_be_0'
  from public.families
  union all select 'inventory', 'student_families_legacy', count(*)::bigint, 'must_be_0'
  from public.student_families
  union all select 'inventory', 'teachers_legacy', count(*)::bigint, 'must_be_0'
  from public.teachers

  union all select 'academic', 'evaluation_criteria', count(*)::bigint, 'must_be_14'
  from public.evaluation_criteria
  union all select 'academic', 'partial_grades', count(*)::bigint, 'must_be_17'
  from public.partial_grades
  union all select 'academic', 'term_subject_grades', count(*)::bigint, 'must_be_2'
  from public.term_subject_grades

  union all select 'blocker', 'courses_with_orphan_year', count(*)::bigint, 'must_be_0'
  from public.courses course
  left join public.academic_years academic_year on academic_year.id = course.academic_year_id
  where academic_year.id is null

  union all select 'blocker', 'course_subjects_with_invalid_root', count(*)::bigint, 'must_be_0'
  from public.course_subjects relation
  left join public.courses course on course.id = relation.course_id
  left join public.subjects subject on subject.id = relation.subject_id
  left join public.academic_years academic_year on academic_year.id = relation.academic_year_id
  where course.id is null
     or subject.id is null
     or academic_year.id is null
     or course.academic_year_id is distinct from relation.academic_year_id

  union all select 'blocker', 'students_with_invalid_root', count(*)::bigint, 'must_be_0'
  from public.students student
  left join public.courses course on course.id = student.course_id
  left join public.academic_years academic_year on academic_year.id = student.academic_year_id
  left join public.profiles tutor on tutor.id = student.tutor_teacher_id
  where course.id is null
     or academic_year.id is null
     or course.academic_year_id is distinct from student.academic_year_id
     or tutor.id is null
     or tutor.role <> 'tutor'
     or tutor.active is not true

  union all select 'blocker', 'parent_students_with_invalid_root', count(*)::bigint, 'must_be_0'
  from public.parent_students relation
  left join public.students student on student.id = relation.student_id
  left join public.profiles family on family.id = relation.parent_id
  where student.id is null
     or family.id is null
     or family.role <> 'family'
     or family.active is not true

  union all select 'blocker', 'teacher_assignments_with_invalid_root', count(*)::bigint, 'must_be_0'
  from public.teacher_assignments assignment
  left join public.profiles tutor on tutor.id = assignment.teacher_id
  left join public.courses course on course.id = assignment.course_id
  left join public.subjects subject on subject.id = assignment.subject_id
  left join public.academic_years academic_year on academic_year.id = assignment.academic_year_id
  left join public.course_subjects relation
    on relation.course_id = assignment.course_id
   and relation.subject_id = assignment.subject_id
   and relation.academic_year_id = assignment.academic_year_id
  where tutor.id is null
     or tutor.role <> 'tutor'
     or tutor.active is not true
     or course.id is null
     or subject.id is null
     or academic_year.id is null
     or relation.id is null
     or course.academic_year_id is distinct from assignment.academic_year_id

  union all select 'blocker', 'duplicate_course_subject_groups', count(*)::bigint, 'must_be_0'
  from (
    select course_id, subject_id, academic_year_id
    from public.course_subjects
    group by course_id, subject_id, academic_year_id
    having count(*) > 1
  ) duplicates

  union all select 'blocker', 'duplicate_parent_student_groups', count(*)::bigint, 'must_be_0'
  from (
    select parent_id, student_id
    from public.parent_students
    group by parent_id, student_id
    having count(*) > 1
  ) duplicates

  union all select 'blocker', 'duplicate_teacher_assignment_groups', count(*)::bigint, 'must_be_0'
  from (
    select teacher_id, course_id, subject_id, academic_year_id
    from public.teacher_assignments
    group by teacher_id, course_id, subject_id, academic_year_id
    having count(*) > 1
  ) duplicates

  union all select 'multitenant', 'schools_table_present',
    (to_regclass('public.schools') is not null)::int::bigint,
    'must_be_0_before_034'
  union all select 'multitenant', 'school_memberships_table_present',
    (to_regclass('public.school_memberships') is not null)::int::bigint,
    'must_be_0_before_034'
  union all select 'multitenant', 'school_id_columns', count(*)::bigint,
    'must_be_0_before_034'
  from information_schema.columns
  where table_schema = 'public' and column_name = 'school_id'
)
select category, metric, total, expectation
from metrics
order by category, metric;
