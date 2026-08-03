-- Sprint 20.2M1 - production promotion preflight.
-- STRICTLY READ ONLY: one SELECT statement, aggregate counters only.
-- This verifier targets the production schema before migrations 034-041.
-- It never returns names, emails, UUIDs, grades, observations or other PII.

with metrics as (
  select 'structure'::text as category, 'schools_table_present'::text as metric,
    (to_regclass('public.schools') is not null)::int::bigint as total,
    'must_be_1_before_035'::text as expectation
  union all
  select 'structure', 'school_memberships_table_present',
    (to_regclass('public.school_memberships') is not null)::int::bigint,
    'must_be_1_before_035'
  union all
  select 'structure', 'school_id_columns_present', count(*)::bigint,
    'must_be_0_before_034_and_26_after_039'
  from information_schema.columns
  where table_schema = 'public' and column_name = 'school_id'
  union all
  select 'structure', 'public_tables_with_rls_disabled', count(*)::bigint,
    'review_before_promotion'
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and not relation.relrowsecurity
  union all
  select 'structure', 'tenant_helper_functions_present', count(distinct routine_name)::bigint,
    'must_be_0_before_034_and_21_after_040'
  from information_schema.routines
  where routine_schema = 'public'
    and routine_name in (
      'academic_can_manage_publication',
      'academic_can_read_course',
      'academic_can_read_course_subject',
      'academic_can_read_student_result',
      'academic_can_write_course_subject',
      'academic_can_write_student_result',
      'academic_family_can_read_final',
      'academic_family_can_read_partial',
      'academic_family_can_read_publication',
      'academic_family_can_read_term',
      'academic_is_director',
      'academic_is_family',
      'academic_is_superadmin',
      'academic_is_tutor',
      'academic_is_valid_publication_actor',
      'academic_school_is_active',
      'can_manage_school_configuration',
      'has_school_role',
      'is_active_school_member',
      'set_and_validate_academic_operation_school',
      'user_has_active_school_role'
    )
  union all
  select 'structure', 'legacy_active_year_helper_present', count(*)::bigint,
    'expected_1_before_036'
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'active_academic_year_id'
    and pg_get_function_identity_arguments(procedure.oid) = ''
  union all
  select 'structure', 'tenant_active_year_helper_present', count(*)::bigint,
    'expected_0_before_036_and_1_after_036'
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'active_academic_year_id'
    and pg_get_function_identity_arguments(procedure.oid) = 'p_school_id uuid'

  union all select 'inventory', 'auth_users', count(*)::bigint, 'informational' from auth.users
  union all select 'inventory', 'profiles', count(*)::bigint, 'informational' from public.profiles
  union all select 'inventory', 'academic_years', count(*)::bigint, 'informational' from public.academic_years
  union all select 'inventory', 'courses', count(*)::bigint, 'informational' from public.courses
  union all select 'inventory', 'subjects', count(*)::bigint, 'informational' from public.subjects
  union all select 'inventory', 'course_subjects', count(*)::bigint, 'informational' from public.course_subjects
  union all select 'inventory', 'students', count(*)::bigint, 'informational' from public.students
  union all select 'inventory', 'families_legacy', count(*)::bigint, 'must_be_0_for_037' from public.families
  union all select 'inventory', 'student_families_legacy', count(*)::bigint, 'informational' from public.student_families
  union all select 'inventory', 'parent_students', count(*)::bigint, 'informational' from public.parent_students
  union all select 'inventory', 'teachers_legacy', count(*)::bigint, 'must_be_0_for_037' from public.teachers
  union all select 'inventory', 'teacher_assignments', count(*)::bigint, 'informational' from public.teacher_assignments
  union all select 'inventory', 'partial_grades', count(*)::bigint, 'informational' from public.partial_grades
  union all select 'inventory', 'evaluation_criteria', count(*)::bigint, 'informational' from public.evaluation_criteria
  union all select 'inventory', 'quarter_final_grades', count(*)::bigint, 'informational' from public.quarter_final_grades
  union all select 'inventory', 'term_subject_grades', count(*)::bigint, 'informational' from public.term_subject_grades
  union all select 'inventory', 'evaluation_publications', count(*)::bigint, 'informational' from public.evaluation_publications
  union all select 'inventory', 'annual_evaluation_weights', count(*)::bigint, 'informational' from public.annual_evaluation_weights
  union all select 'inventory', 'final_course_grades', count(*)::bigint, 'informational' from public.final_course_grades
  union all select 'inventory', 'final_evaluation_publications', count(*)::bigint, 'informational' from public.final_evaluation_publications

  union all
  select 'identity', 'auth_users_without_profile', count(*)::bigint, 'must_be_0'
  from auth.users user_row
  left join public.profiles profile on profile.id = user_row.id
  where profile.id is null
  union all
  select 'identity', 'profiles_without_auth_user', count(*)::bigint, 'must_be_0'
  from public.profiles profile
  left join auth.users user_row on user_row.id = profile.id
  where user_row.id is null
  union all
  select 'identity', 'inactive_profiles', count(*)::bigint, 'review_membership_activation'
  from public.profiles where active is not true

  union all
  select 'configuration', 'active_academic_years', count(*)::bigint, 'must_be_exactly_1_for_single_tenant_backfill'
  from public.academic_years where active
  union all
  select 'configuration', 'courses_with_orphan_year', count(*)::bigint, 'must_be_0'
  from public.courses course
  left join public.academic_years academic_year on academic_year.id = course.academic_year_id
  where academic_year.id is null
  union all
  select 'configuration', 'course_subjects_with_null_root', count(*)::bigint, 'must_be_0'
  from public.course_subjects relation
  where relation.course_id is null
     or relation.subject_id is null
     or relation.academic_year_id is null
  union all
  select 'configuration', 'course_subjects_with_orphan_root', count(*)::bigint, 'must_be_0'
  from public.course_subjects relation
  left join public.courses course on course.id = relation.course_id
  left join public.subjects subject on subject.id = relation.subject_id
  left join public.academic_years academic_year on academic_year.id = relation.academic_year_id
  where course.id is null or subject.id is null or academic_year.id is null
  union all
  select 'configuration', 'course_subjects_with_year_mismatch', count(*)::bigint, 'must_be_0'
  from public.course_subjects relation
  join public.courses course on course.id = relation.course_id
  where relation.academic_year_id is distinct from course.academic_year_id
  union all
  select 'configuration', 'duplicate_course_subject_groups', count(*)::bigint, 'must_be_0'
  from (
    select course_id, subject_id, academic_year_id
    from public.course_subjects
    group by course_id, subject_id, academic_year_id
    having count(*) > 1
  ) duplicate_row

  union all
  select 'people', 'students_without_course', count(*)::bigint, 'must_be_0'
  from public.students where course_id is null
  union all
  select 'people', 'students_with_orphan_course_or_year', count(*)::bigint, 'must_be_0'
  from public.students student
  left join public.courses course on course.id = student.course_id
  left join public.academic_years academic_year on academic_year.id = student.academic_year_id
  where course.id is null or academic_year.id is null
  union all
  select 'people', 'students_with_course_year_mismatch', count(*)::bigint, 'must_be_0'
  from public.students student
  join public.courses course on course.id = student.course_id
  where student.academic_year_id is distinct from course.academic_year_id
  union all
  select 'people', 'students_with_invalid_tutor_profile', count(*)::bigint, 'must_be_0'
  from public.students student
  left join public.profiles profile on profile.id = student.tutor_teacher_id
  where student.tutor_teacher_id is not null
    and (profile.id is null or profile.active is not true or profile.role <> 'tutor')
  union all
  select 'people', 'parent_students_with_null_root', count(*)::bigint, 'must_be_0'
  from public.parent_students
  where parent_id is null or student_id is null
  union all
  select 'people', 'parent_students_with_orphan_or_wrong_role', count(*)::bigint, 'must_be_0'
  from public.parent_students relation
  left join public.profiles profile on profile.id = relation.parent_id
  left join public.students student on student.id = relation.student_id
  where profile.id is null
     or profile.role <> 'family'
     or profile.active is not true
     or student.id is null
  union all
  select 'people', 'duplicate_parent_student_groups', count(*)::bigint, 'must_be_0'
  from (
    select parent_id, student_id
    from public.parent_students
    group by parent_id, student_id
    having count(*) > 1
  ) duplicate_row
  union all
  select 'people', 'student_families_with_orphan_root', count(*)::bigint, 'must_be_0'
  from public.student_families relation
  left join public.students student on student.id = relation.student_id
  left join public.families family on family.id = relation.family_id
  where student.id is null or family.id is null
  union all
  select 'people', 'duplicate_student_family_groups', count(*)::bigint, 'must_be_0'
  from (
    select student_id, family_id
    from public.student_families
    group by student_id, family_id
    having count(*) > 1
  ) duplicate_row
  union all
  select 'people', 'teacher_assignments_with_null_root', count(*)::bigint, 'must_be_0'
  from public.teacher_assignments
  where teacher_id is null or course_id is null or subject_id is null or academic_year_id is null
  union all
  select 'people', 'teacher_assignments_with_orphan_or_wrong_role', count(*)::bigint, 'must_be_0'
  from public.teacher_assignments assignment
  left join public.profiles profile on profile.id = assignment.teacher_id
  left join public.courses course on course.id = assignment.course_id
  left join public.subjects subject on subject.id = assignment.subject_id
  left join public.academic_years academic_year on academic_year.id = assignment.academic_year_id
  where profile.id is null
     or profile.role <> 'tutor'
     or profile.active is not true
     or course.id is null
     or subject.id is null
     or academic_year.id is null
  union all
  select 'people', 'teacher_assignments_with_year_mismatch', count(*)::bigint, 'must_be_0'
  from public.teacher_assignments assignment
  join public.courses course on course.id = assignment.course_id
  where assignment.academic_year_id is distinct from course.academic_year_id
  union all
  select 'people', 'teacher_assignments_without_course_subject', count(*)::bigint, 'must_be_0'
  from public.teacher_assignments assignment
  where not exists (
    select 1 from public.course_subjects relation
    where relation.course_id = assignment.course_id
      and relation.subject_id = assignment.subject_id
      and relation.academic_year_id = assignment.academic_year_id
  )
  union all
  select 'people', 'duplicate_teacher_assignment_groups', count(*)::bigint, 'must_be_0'
  from (
    select teacher_id, course_id, subject_id, academic_year_id
    from public.teacher_assignments
    group by teacher_id, course_id, subject_id, academic_year_id
    having count(*) > 1
  ) duplicate_row

  union all
  select 'academic', 'partial_grades_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.partial_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where student.id is null or course.id is null or subject.id is null or academic_year.id is null
     or student.course_id is distinct from row_data.course_id
     or student.academic_year_id is distinct from row_data.academic_year_id
     or course.academic_year_id is distinct from row_data.academic_year_id
     or not exists (
       select 1 from public.teacher_assignments assignment
       where assignment.teacher_id = row_data.teacher_id
         and assignment.course_id = row_data.course_id
         and assignment.subject_id = row_data.subject_id
         and assignment.academic_year_id = row_data.academic_year_id
     )
     or not exists (
       select 1 from public.course_subjects relation
       where relation.course_id = row_data.course_id
         and relation.subject_id = row_data.subject_id
         and relation.academic_year_id = row_data.academic_year_id
     )
  union all
  select 'academic', 'evaluation_criteria_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.evaluation_criteria row_data
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where course.id is null or subject.id is null or academic_year.id is null
     or course.academic_year_id is distinct from row_data.academic_year_id
     or not exists (
       select 1 from public.teacher_assignments assignment
       where assignment.teacher_id = row_data.teacher_id
         and assignment.course_id = row_data.course_id
         and assignment.subject_id = row_data.subject_id
         and assignment.academic_year_id = row_data.academic_year_id
     )
     or not exists (
       select 1 from public.course_subjects relation
       where relation.course_id = row_data.course_id
         and relation.subject_id = row_data.subject_id
         and relation.academic_year_id = row_data.academic_year_id
     )
  union all
  select 'academic', 'quarter_final_grades_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.quarter_final_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where student.id is null or course.id is null or subject.id is null or academic_year.id is null
     or student.course_id is distinct from row_data.course_id
     or student.academic_year_id is distinct from row_data.academic_year_id
     or course.academic_year_id is distinct from row_data.academic_year_id
     or not exists (
       select 1 from public.teacher_assignments assignment
       where assignment.teacher_id = row_data.teacher_id
         and assignment.course_id = row_data.course_id
         and assignment.subject_id = row_data.subject_id
         and assignment.academic_year_id = row_data.academic_year_id
     )
     or not exists (
       select 1 from public.course_subjects relation
       where relation.course_id = row_data.course_id
         and relation.subject_id = row_data.subject_id
         and relation.academic_year_id = row_data.academic_year_id
     )
  union all
  select 'academic', 'term_subject_grades_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.term_subject_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where student.id is null or course.id is null or subject.id is null or academic_year.id is null
     or student.course_id is distinct from row_data.course_id
     or student.academic_year_id is distinct from row_data.academic_year_id
     or course.academic_year_id is distinct from row_data.academic_year_id
     or not exists (
       select 1 from public.teacher_assignments assignment
       where assignment.teacher_id = row_data.teacher_id
         and assignment.course_id = row_data.course_id
         and assignment.subject_id = row_data.subject_id
         and assignment.academic_year_id = row_data.academic_year_id
     )
     or not exists (
       select 1 from public.course_subjects relation
       where relation.course_id = row_data.course_id
         and relation.subject_id = row_data.subject_id
         and relation.academic_year_id = row_data.academic_year_id
     )
  union all
  select 'academic', 'annual_weights_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.annual_evaluation_weights row_data
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where course.id is null or subject.id is null or academic_year.id is null
     or course.academic_year_id is distinct from row_data.academic_year_id
     or not exists (
       select 1 from public.teacher_assignments assignment
       where assignment.teacher_id = row_data.teacher_id
         and assignment.course_id = row_data.course_id
         and assignment.subject_id = row_data.subject_id
         and assignment.academic_year_id = row_data.academic_year_id
     )
     or not exists (
       select 1 from public.course_subjects relation
       where relation.course_id = row_data.course_id
         and relation.subject_id = row_data.subject_id
         and relation.academic_year_id = row_data.academic_year_id
     )
  union all
  select 'academic', 'final_course_grades_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.final_course_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where student.id is null or course.id is null or subject.id is null or academic_year.id is null
     or student.course_id is distinct from row_data.course_id
     or student.academic_year_id is distinct from row_data.academic_year_id
     or course.academic_year_id is distinct from row_data.academic_year_id
     or not exists (
       select 1 from public.teacher_assignments assignment
       where assignment.teacher_id = row_data.teacher_id
         and assignment.course_id = row_data.course_id
         and assignment.subject_id = row_data.subject_id
         and assignment.academic_year_id = row_data.academic_year_id
     )
     or not exists (
       select 1 from public.course_subjects relation
       where relation.course_id = row_data.course_id
         and relation.subject_id = row_data.subject_id
         and relation.academic_year_id = row_data.academic_year_id
     )
  union all
  select 'academic', 'evaluation_publications_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.evaluation_publications row_data
  left join public.courses course on course.id = row_data.course_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where course.id is null or academic_year.id is null
     or course.academic_year_id is distinct from row_data.academic_year_id
     or (row_data.published and (row_data.published_at is null or row_data.published_by is null))
  union all
  select 'academic', 'final_publications_unresolved_context', count(*)::bigint, 'must_be_0'
  from public.final_evaluation_publications row_data
  left join public.courses course on course.id = row_data.course_id
  left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
  where course.id is null or academic_year.id is null
     or course.academic_year_id is distinct from row_data.academic_year_id
     or (row_data.published and (row_data.published_at is null or row_data.published_by is null))

  union all
  select 'duplicates', 'partial_grades_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, student_id, subject_id, term, assessment_type, assessment_name
    from public.partial_grades
    group by academic_year_id, student_id, subject_id, term, assessment_type, assessment_name
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'evaluation_criteria_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, teacher_id, course_id, subject_id, term, name
    from public.evaluation_criteria
    group by academic_year_id, teacher_id, course_id, subject_id, term, name
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'quarter_final_grades_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, student_id, subject_id, teacher_id, course_id, term
    from public.quarter_final_grades
    group by academic_year_id, student_id, subject_id, teacher_id, course_id, term
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'term_subject_grades_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, student_id, subject_id, term
    from public.term_subject_grades
    group by academic_year_id, student_id, subject_id, term
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'evaluation_publications_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, course_id, term
    from public.evaluation_publications
    group by academic_year_id, course_id, term
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'annual_weights_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, teacher_id, course_id, subject_id
    from public.annual_evaluation_weights
    group by academic_year_id, teacher_id, course_id, subject_id
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'final_course_grades_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, student_id, subject_id
    from public.final_course_grades
    group by academic_year_id, student_id, subject_id
    having count(*) > 1
  ) duplicate_row
  union all
  select 'duplicates', 'final_publications_future_unique_conflicts', count(*)::bigint, 'must_be_0'
  from (
    select academic_year_id, course_id
    from public.final_evaluation_publications
    group by academic_year_id, course_id
    having count(*) > 1
  ) duplicate_row
)
select category, metric, total, expectation
from metrics
order by category, metric;
