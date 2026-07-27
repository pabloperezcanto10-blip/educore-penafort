-- Sprint 20.2E - postflight after migration 037 and rollback-based QA.
-- READ ONLY. Returns catalog and aggregate counts without personal data.

begin transaction read only;

select jsonb_build_object(
  'profiles_has_school_id',
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'school_id'
  ),
  'people_school_id_not_null',
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'students',
        'families',
        'student_families',
        'parent_students',
        'teachers',
        'teacher_assignments'
      )
      and column_name = 'school_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ),
  'people_constraints',
  (
    select count(*)
    from pg_constraint
    where conname in (
      'students_school_id_fkey',
      'families_school_id_fkey',
      'student_families_school_id_fkey',
      'parent_students_school_id_fkey',
      'teachers_school_id_fkey',
      'teacher_assignments_school_id_fkey',
      'students_course_school_fkey',
      'students_academic_year_school_fkey',
      'student_families_student_school_fkey',
      'student_families_family_school_fkey',
      'parent_students_student_school_fkey',
      'teacher_assignments_course_school_fkey',
      'teacher_assignments_subject_school_fkey',
      'teacher_assignments_academic_year_school_fkey'
    )
  ),
  'people_indexes',
  (
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'students_id_school_id_uidx',
        'families_id_school_id_uidx',
        'teachers_id_school_id_uidx',
        'parent_students_school_relation_uidx',
        'teacher_assignments_school_relation_uidx',
        'students_school_id_idx',
        'families_school_id_idx',
        'student_families_school_id_idx',
        'parent_students_school_id_idx',
        'teachers_school_id_idx',
        'teacher_assignments_school_id_idx'
      )
  ),
  'replaced_single_column_fks_remaining',
  (
    select count(*)
    from pg_constraint
    where conname in (
      'students_course_id_fkey',
      'students_academic_year_id_fkey',
      'student_families_student_id_fkey',
      'student_families_family_id_fkey',
      'parent_students_student_id_fkey',
      'teacher_assignments_course_id_fkey',
      'teacher_assignments_subject_id_fkey',
      'teacher_assignments_academic_year_id_fkey'
    )
  ),
  'people_triggers',
  (
    select count(*)
    from pg_trigger
    where tgname in (
      'students_people_school_context',
      'families_people_school_context',
      'student_families_people_school_context',
      'parent_students_people_school_context',
      'teachers_people_school_context',
      'teacher_assignments_people_school_context'
    )
      and not tgisinternal
  ),
  'scoped_people_policies',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and policyname in (
        'students_director_can_read_all_students',
        'students_superadmin_insert_all',
        'students_superadmin_select_all',
        'students_superadmin_update_all',
        'students_tutor_can_read_assigned_students',
        'parent_students_family_select_own',
        'parent_students_superadmin_delete_all',
        'parent_students_superadmin_insert_all',
        'parent_students_superadmin_select_all',
        'teacher_assignments_superadmin_insert_all',
        'teacher_assignments_superadmin_select_all',
        'teacher_assignments_superadmin_update_all',
        'teacher_assignments_teacher_select_own'
      )
      and (
        coalesce(qual, '') like '%has_school_role%'
        or coalesce(with_check, '') like '%has_school_role%'
      )
  ),
  'legacy_people_policies',
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('families', 'student_families', 'teachers')
  ),
  'membership_helper_security_definer',
  exists (
    select 1
    from pg_proc
    where oid =
      'public.user_has_active_school_role(uuid,uuid,public.app_role[])'::regprocedure
      and prosecdef = true
  ),
  'people_trigger_security_definer',
  exists (
    select 1
    from pg_proc
    where oid =
      'public.set_and_validate_people_school_context()'::regprocedure
      and prosecdef = true
  ),
  'public_can_execute_membership_helper',
  has_function_privilege(
    'public',
    'public.user_has_active_school_role(uuid,uuid,public.app_role[])',
    'EXECUTE'
  ),
  'public_can_execute_people_trigger',
  has_function_privilege(
    'public',
    'public.set_and_validate_people_school_context()',
    'EXECUTE'
  ),
  'rows_after_qa',
  jsonb_build_object(
    'students', (select count(*) from public.students),
    'families', (select count(*) from public.families),
    'student_families', (select count(*) from public.student_families),
    'parent_students', (select count(*) from public.parent_students),
    'teachers', (select count(*) from public.teachers),
    'teacher_assignments', (select count(*) from public.teacher_assignments)
  ),
  'memberships_after_qa',
  jsonb_build_object(
    'total', (select count(*) from public.school_memberships),
    'active', (
      select count(*)
      from public.school_memberships
      where active = true
    ),
    'inactive', (
      select count(*)
      from public.school_memberships
      where active = false
    )
  )
) as sprint_20_2e_people_postflight;

rollback;
