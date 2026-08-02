-- SPRINT 20.2L2 / MIGRATION 041 postflight
-- SELECT ONLY. Safe for linked staging verification.

with legacy_names(object_name) as (
  values
    ('partial_grades_unique_assessment_year_idx'),
    ('evaluation_criteria_unique_name_year'),
    ('quarter_final_grades_unique_student_term_year'),
    ('term_subject_grades_unique_student_subject_term_year'),
    ('evaluation_publications_unique_course_term_year'),
    ('annual_weights_unique_year'),
    ('final_course_grades_unique_year'),
    ('final_evaluation_publications_unique_course_year')
), tenant_names(object_name) as (
  values
    ('partial_grades_school_assessment_uidx'),
    ('evaluation_criteria_school_name_uidx'),
    ('quarter_final_grades_school_term_uidx'),
    ('term_subject_grades_school_term_uidx'),
    ('evaluation_publications_school_term_uidx'),
    ('annual_weights_school_uidx'),
    ('final_course_grades_school_uidx'),
    ('final_publications_school_uidx')
), id_school_names(object_name) as (
  values
    ('partial_grades_id_school_id_uidx'),
    ('evaluation_criteria_id_school_id_uidx'),
    ('quarter_final_grades_id_school_id_uidx'),
    ('term_subject_grades_id_school_id_uidx'),
    ('evaluation_publications_id_school_id_uidx'),
    ('annual_evaluation_weights_id_school_id_uidx'),
    ('final_course_grades_id_school_id_uidx'),
    ('final_evaluation_publications_id_school_id_uidx')
), object_counts as (
  select
    (select count(*) from legacy_names names
      join pg_class objects on objects.relname = names.object_name
      join pg_namespace namespaces on namespaces.oid = objects.relnamespace
      where namespaces.nspname = 'public') as legacy_objects,
    (select count(*) from tenant_names names
      join pg_class indexes on indexes.relname = names.object_name
      join pg_namespace namespaces on namespaces.oid = indexes.relnamespace
      join pg_index metadata on metadata.indexrelid = indexes.oid
      where namespaces.nspname = 'public'
        and metadata.indisunique and metadata.indisvalid and metadata.indisready
        and metadata.indpred is null and metadata.indexprs is null) as tenant_objects,
    (select count(*) from id_school_names names
      join pg_class indexes on indexes.relname = names.object_name
      join pg_namespace namespaces on namespaces.oid = indexes.relnamespace
      join pg_index metadata on metadata.indexrelid = indexes.oid
      where namespaces.nspname = 'public'
        and metadata.indisunique and metadata.indisvalid and metadata.indisready) as id_school_objects
), inventory as (
  select
    (select count(*) from pg_policies
      where schemaname = 'public' and tablename in (
        'partial_grades', 'evaluation_criteria', 'quarter_final_grades',
        'term_subject_grades', 'evaluation_publications',
        'annual_evaluation_weights', 'final_course_grades',
        'final_evaluation_publications')) as policy_count,
    (select md5(string_agg(
        schemaname || '.' || tablename || ':' || policyname || ':' || cmd || ':' ||
        coalesce(qual, '') || ':' || coalesce(with_check, ''),
        E'\n' order by schemaname, tablename, policyname
      )) from pg_policies
      where schemaname = 'public' and tablename in (
        'partial_grades', 'evaluation_criteria', 'quarter_final_grades',
        'term_subject_grades', 'evaluation_publications',
        'annual_evaluation_weights', 'final_course_grades',
        'final_evaluation_publications')) as policy_fingerprint,
    (select count(*) from information_schema.role_table_grants
      where table_schema = 'public' and table_name in (
        'partial_grades', 'evaluation_criteria', 'quarter_final_grades',
        'term_subject_grades', 'evaluation_publications',
        'annual_evaluation_weights', 'final_course_grades',
        'final_evaluation_publications')) as grant_count,
    (select md5(string_agg(
        grantee || ':' || table_name || ':' || privilege_type || ':' || is_grantable,
        E'\n' order by grantee, table_name, privilege_type
      )) from information_schema.role_table_grants
      where table_schema = 'public' and table_name in (
        'partial_grades', 'evaluation_criteria', 'quarter_final_grades',
        'term_subject_grades', 'evaluation_publications',
        'annual_evaluation_weights', 'final_course_grades',
        'final_evaluation_publications')) as grant_fingerprint,
    (select count(*) from pg_trigger trigger_data
      join pg_class table_class on table_class.oid = trigger_data.tgrelid
      join pg_namespace table_namespace on table_namespace.oid = table_class.relnamespace
      where table_namespace.nspname = 'public'
        and table_class.relname in (
          'partial_grades', 'evaluation_criteria', 'quarter_final_grades',
          'term_subject_grades', 'evaluation_publications',
          'annual_evaluation_weights', 'final_course_grades',
          'final_evaluation_publications')
        and not trigger_data.tgisinternal) as trigger_count,
    (select md5(string_agg(
        table_class.relname || ':' || trigger_data.tgname || ':' ||
        pg_get_triggerdef(trigger_data.oid, true),
        E'\n' order by table_class.relname, trigger_data.tgname
      )) from pg_trigger trigger_data
      join pg_class table_class on table_class.oid = trigger_data.tgrelid
      join pg_namespace table_namespace on table_namespace.oid = table_class.relnamespace
      where table_namespace.nspname = 'public'
        and table_class.relname in (
          'partial_grades', 'evaluation_criteria', 'quarter_final_grades',
          'term_subject_grades', 'evaluation_publications',
          'annual_evaluation_weights', 'final_course_grades',
          'final_evaluation_publications')
        and not trigger_data.tgisinternal) as trigger_fingerprint
), row_state as (
  select
    (select count(*) from public.partial_grades) +
    (select count(*) from public.evaluation_criteria) +
    (select count(*) from public.quarter_final_grades) +
    (select count(*) from public.term_subject_grades) +
    (select count(*) from public.evaluation_publications) +
    (select count(*) from public.annual_evaluation_weights) +
    (select count(*) from public.final_course_grades) +
    (select count(*) from public.final_evaluation_publications) as total_rows,
    (select count(*) from public.partial_grades where school_id is null or academic_year_id is null) +
    (select count(*) from public.evaluation_criteria where school_id is null or academic_year_id is null) +
    (select count(*) from public.quarter_final_grades where school_id is null or academic_year_id is null) +
    (select count(*) from public.term_subject_grades where school_id is null or academic_year_id is null) +
    (select count(*) from public.evaluation_publications where school_id is null or academic_year_id is null) +
    (select count(*) from public.annual_evaluation_weights where school_id is null or academic_year_id is null) +
    (select count(*) from public.final_course_grades where school_id is null or academic_year_id is null) +
    (select count(*) from public.final_evaluation_publications where school_id is null or academic_year_id is null) as null_context_rows,
    (select count(*) from public.evaluation_publications where published) +
    (select count(*) from public.final_evaluation_publications where published) as published_rows,
    (select count(*) from public.partial_grades where visible_to_family) +
    (select count(*) from public.evaluation_criteria where visible_to_family) as visible_to_family_rows
), duplicate_state as (
  select
    (select count(*) from (select 1 from public.partial_grades group by school_id, academic_year_id, student_id, subject_id, term, assessment_type, assessment_name having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.evaluation_criteria group by school_id, academic_year_id, teacher_id, course_id, subject_id, term, name having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.quarter_final_grades group by school_id, academic_year_id, student_id, subject_id, teacher_id, course_id, term having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.term_subject_grades group by school_id, academic_year_id, student_id, subject_id, term having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.evaluation_publications group by school_id, academic_year_id, course_id, term having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.annual_evaluation_weights group by school_id, academic_year_id, teacher_id, course_id, subject_id having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.final_course_grades group by school_id, academic_year_id, student_id, subject_id having count(*) > 1) rows) +
    (select count(*) from (select 1 from public.final_evaluation_publications group by school_id, academic_year_id, course_id having count(*) > 1) rows) as incompatible_duplicates
)
select
  object_counts.legacy_objects,
  object_counts.tenant_objects,
  object_counts.id_school_objects,
  duplicate_state.incompatible_duplicates,
  row_state.null_context_rows,
  row_state.total_rows,
  row_state.published_rows,
  row_state.visible_to_family_rows,
  inventory.policy_count,
  inventory.policy_fingerprint,
  inventory.grant_count,
  inventory.grant_fingerprint,
  inventory.trigger_count,
  inventory.trigger_fingerprint,
  object_counts.legacy_objects = 0
    and object_counts.tenant_objects = 8
    and object_counts.id_school_objects = 8
    and duplicate_state.incompatible_duplicates = 0
    and row_state.null_context_rows = 0
    and inventory.policy_count = 36
    and inventory.policy_fingerprint = '54d744d57103f02bed4fc9ca8afe8ae9'
    and inventory.grant_count = 143
    and inventory.grant_fingerprint = '4c115015d47b3728794e976ce3ea9188'
    and inventory.trigger_count = 21
    and inventory.trigger_fingerprint = '2df212e0d37809a32bb782db81856f6c'
    as ready_after_041
from object_counts, inventory, row_state, duplicate_state;
