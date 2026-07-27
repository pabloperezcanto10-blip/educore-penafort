-- Sprint 20.2E - deterministic people preflight.
-- READ ONLY. This file never returns names, emails or other personal data.

begin transaction read only;

with
student_status as (
  select
    student.id,
    case
      when student.course_id is null then 'missing_course'
      when course.id is null then 'orphan_course'
      when academic_year.id is null then 'orphan_academic_year'
      when course.school_id is null or academic_year.school_id is null
        then 'missing_academic_school'
      when course.school_id is distinct from academic_year.school_id
        then 'cross_school_course_year'
      when course.academic_year_id is distinct from student.academic_year_id
        then 'course_year_mismatch'
      when student.tutor_teacher_id is not null
        and (
          tutor_profile.id is null
          or tutor_profile.active is not true
        )
        then 'invalid_tutor_profile'
      when student.tutor_teacher_id is not null
        and not exists (
          select 1
          from public.school_memberships membership
          join public.schools school
            on school.id = membership.school_id
           and school.active = true
          where membership.user_id = student.tutor_teacher_id
            and membership.school_id = course.school_id
            and membership.role = 'tutor'
            and membership.active = true
        )
        then 'missing_active_tutor_membership'
      else 'resolvable'
    end as resolution
  from public.students student
  left join public.courses course on course.id = student.course_id
  left join public.academic_years academic_year
    on academic_year.id = student.academic_year_id
  left join public.profiles tutor_profile
    on tutor_profile.id = student.tutor_teacher_id
),
family_status as (
  select
    family.id,
    case
      when count(relation.family_id) = 0 then 'missing_student_relation'
      when bool_or(
        relation.student_id is null
        or student.id is null
        or course.id is null
        or student_status.resolution is distinct from 'resolvable'
      ) then 'invalid_student_relation'
      when count(distinct course.school_id) = 0 then 'missing_school_candidate'
      when count(distinct course.school_id) > 1 then 'ambiguous_multiple_schools'
      else 'resolvable'
    end as resolution
  from public.families family
  left join public.student_families relation
    on relation.family_id = family.id
  left join public.students student on student.id = relation.student_id
  left join public.courses course on course.id = student.course_id
  left join student_status on student_status.id = student.id
  group by family.id
),
student_family_status as (
  select
    concat_ws(':', relation.student_id::text, relation.family_id::text) as id,
    case
      when student.id is null then 'orphan_student'
      when family.id is null then 'orphan_family'
      when student_status.resolution is distinct from 'resolvable'
        then 'invalid_student_context'
      when family_status.resolution is distinct from 'resolvable'
        then 'invalid_family_context'
      else 'resolvable'
    end as resolution
  from public.student_families relation
  left join public.students student on student.id = relation.student_id
  left join public.families family on family.id = relation.family_id
  left join student_status on student_status.id = relation.student_id
  left join family_status on family_status.id = relation.family_id
),
parent_student_status as (
  select
    relation.id,
    case
      when count(*) over (
        partition by relation.parent_id, relation.student_id
      ) > 1 then 'duplicate_relation'
      when relation.parent_id is null then 'missing_parent'
      when relation.student_id is null then 'missing_student'
      when student.id is null then 'orphan_student'
      when course.id is null then 'student_without_course'
      when parent_profile.id is null then 'orphan_parent_profile'
      when parent_profile.active is not true then 'inactive_parent_profile'
      when student_status.resolution is distinct from 'resolvable'
        then 'invalid_student_context'
      when not exists (
        select 1
        from public.school_memberships membership
        join public.schools school
          on school.id = membership.school_id
         and school.active = true
        where membership.user_id = relation.parent_id
          and membership.school_id = course.school_id
          and membership.role = 'family'
          and membership.active = true
      ) then 'missing_active_family_membership'
      else 'resolvable'
    end as resolution
  from public.parent_students relation
  left join public.students student on student.id = relation.student_id
  left join public.courses course on course.id = student.course_id
  left join public.profiles parent_profile
    on parent_profile.id = relation.parent_id
  left join student_status on student_status.id = relation.student_id
),
teacher_assignment_status as (
  select
    assignment.id,
    case
      when count(*) over (
        partition by
          assignment.teacher_id,
          assignment.course_id,
          assignment.subject_id,
          assignment.academic_year_id
      ) > 1 then 'duplicate_assignment'
      when assignment.teacher_id is null then 'missing_teacher'
      when assignment.course_id is null then 'missing_course'
      when assignment.subject_id is null then 'missing_subject'
      when course.id is null then 'orphan_course'
      when subject.id is null then 'orphan_subject'
      when academic_year.id is null then 'orphan_academic_year'
      when course.school_id is distinct from subject.school_id
        then 'cross_school_course_subject'
      when course.school_id is distinct from academic_year.school_id
        then 'cross_school_course_year'
      when course.academic_year_id is distinct from assignment.academic_year_id
        then 'course_year_mismatch'
      when teacher_profile.id is null then 'orphan_teacher_profile'
      when teacher_profile.active is not true then 'inactive_teacher_profile'
      when not exists (
        select 1
        from public.school_memberships membership
        join public.schools school
          on school.id = membership.school_id
         and school.active = true
        where membership.user_id = assignment.teacher_id
          and membership.school_id = course.school_id
          and membership.role = 'tutor'
          and membership.active = true
      ) then 'missing_active_tutor_membership'
      else 'resolvable'
    end as resolution
  from public.teacher_assignments assignment
  left join public.courses course on course.id = assignment.course_id
  left join public.subjects subject on subject.id = assignment.subject_id
  left join public.academic_years academic_year
    on academic_year.id = assignment.academic_year_id
  left join public.profiles teacher_profile
    on teacher_profile.id = assignment.teacher_id
),
people_report as (
  select
    'students'::text as table_name,
    count(*)::bigint as total,
    count(*) filter (where resolution = 'resolvable')::bigint as resolvable,
    0::bigint as ambiguous,
    count(*) filter (where resolution <> 'resolvable')::bigint as blocking,
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', id, 'reason', resolution)
        order by id
      ) filter (where resolution <> 'resolvable'),
      '[]'::jsonb
    ) as blocker_ids
  from student_status

  union all

  select
    'families',
    count(*),
    count(*) filter (where resolution = 'resolvable'),
    count(*) filter (where resolution = 'ambiguous_multiple_schools'),
    count(*) filter (where resolution <> 'resolvable'),
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', id, 'reason', resolution)
        order by id
      ) filter (where resolution <> 'resolvable'),
      '[]'::jsonb
    )
  from family_status

  union all

  select
    'student_families',
    count(*),
    count(*) filter (where resolution = 'resolvable'),
    0,
    count(*) filter (where resolution <> 'resolvable'),
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', id, 'reason', resolution)
        order by id
      ) filter (where resolution <> 'resolvable'),
      '[]'::jsonb
    )
  from student_family_status

  union all

  select
    'parent_students',
    count(*),
    count(*) filter (where resolution = 'resolvable'),
    0,
    count(*) filter (where resolution <> 'resolvable'),
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', id, 'reason', resolution)
        order by id
      ) filter (where resolution <> 'resolvable'),
      '[]'::jsonb
    )
  from parent_student_status

  union all

  select
    'teachers',
    count(*),
    0,
    0,
    count(*),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          id,
          'reason',
          'legacy_teacher_requires_audited_mapping'
        )
        order by id
      ),
      '[]'::jsonb
    )
  from public.teachers

  union all

  select
    'teacher_assignments',
    count(*),
    count(*) filter (where resolution = 'resolvable'),
    0,
    count(*) filter (where resolution <> 'resolvable'),
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', id, 'reason', resolution)
        order by id
      ) filter (where resolution <> 'resolvable'),
      '[]'::jsonb
    )
  from teacher_assignment_status
),
membership_report as (
  select jsonb_build_object(
    'total',
    (select count(*) from public.school_memberships),
    'active',
    (
      select count(*)
      from public.school_memberships
      where active = true
    ),
    'inactive',
    (
      select count(*)
      from public.school_memberships
      where active = false
    ),
    'orphan_user_or_profile',
    (
      select count(*)
      from public.school_memberships membership
      left join auth.users auth_user on auth_user.id = membership.user_id
      left join public.profiles profile on profile.id = membership.user_id
      where auth_user.id is null or profile.id is null
    ),
    'inactive_school_or_profile',
    (
      select count(*)
      from public.school_memberships membership
      join public.schools school on school.id = membership.school_id
      join public.profiles profile on profile.id = membership.user_id
      where membership.active = true
        and (school.active is not true or profile.active is not true)
    ),
    'duplicate_active_user_school_role',
    (
      select count(*)
      from (
        select user_id, school_id, role
        from public.school_memberships
        where active = true
        group by user_id, school_id, role
        having count(*) > 1
      ) duplicate
    ),
    'multi_school_active_users',
    (
      select count(*)
      from (
        select user_id
        from public.school_memberships
        where active = true
        group by user_id
        having count(distinct school_id) > 1
      ) multischool
    )
  ) as report
),
schema_report as (
  select jsonb_build_object(
    'profiles_has_school_id',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'school_id'
    ),
    'people_school_id_columns',
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
    ),
    'configuration_school_id_not_null',
    (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name in (
          'academic_years',
          'courses',
          'subjects',
          'course_subjects'
        )
        and column_name = 'school_id'
        and data_type = 'uuid'
        and is_nullable = 'NO'
    ),
    'configuration_identity_unique_indexes',
    (
      select count(*)
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'academic_years_id_school_id_uidx',
          'courses_id_school_id_uidx',
          'subjects_id_school_id_uidx'
        )
    ),
    'required_people_policies',
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
    ),
    'replaceable_people_foreign_keys',
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
    'people_tables_with_rls',
    (
      select count(*)
      from pg_class table_class
      join pg_namespace namespace
        on namespace.oid = table_class.relnamespace
      where namespace.nspname = 'public'
        and table_class.relname in (
          'students',
          'families',
          'student_families',
          'parent_students',
          'teachers',
          'teacher_assignments'
        )
        and table_class.relrowsecurity = true
    ),
    'has_school_role_function',
    exists (
      select 1
      from pg_proc
      where oid = 'public.has_school_role(uuid,public.app_role[])'::regprocedure
    )
  ) as report
)
select jsonb_build_object(
  'environment', 'staging',
  'people', (
    select jsonb_object_agg(table_name, to_jsonb(people_report) - 'table_name')
    from people_report
  ),
  'memberships', (select report from membership_report),
  'schema', (select report from schema_report),
  'global_blockers', jsonb_build_object(
    'profiles_without_auth_user',
    (
      select count(*)
      from public.profiles profile
      left join auth.users auth_user on auth_user.id = profile.id
      where auth_user.id is null
    ),
    'auth_users_without_profile',
    (
      select count(*)
      from auth.users auth_user
      left join public.profiles profile on profile.id = auth_user.id
      where profile.id is null
    ),
    'people_blockers',
    (select sum(blocking) from people_report)
  )
) as sprint_20_2e_people_preflight;

rollback;
