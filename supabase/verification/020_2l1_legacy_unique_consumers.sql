-- Sprint 20.2L1: final audit of legacy academic uniqueness objects.
-- READ ONLY: this file contains SELECT statements only.

-- 1. Expected legacy and tenant-aware business uniqueness matrix.
with expected(
  table_name,
  legacy_object,
  legacy_kind,
  legacy_columns,
  tenant_object,
  tenant_columns
) as (
  values
    ('partial_grades', 'partial_grades_unique_assessment_year_idx', 'index',
     'academic_year_id,student_id,subject_id,term,assessment_type,assessment_name',
     'partial_grades_school_assessment_uidx',
     'school_id,academic_year_id,student_id,subject_id,term,assessment_type,assessment_name'),
    ('evaluation_criteria', 'evaluation_criteria_unique_name_year', 'constraint',
     'academic_year_id,teacher_id,course_id,subject_id,term,name',
     'evaluation_criteria_school_name_uidx',
     'school_id,academic_year_id,teacher_id,course_id,subject_id,term,name'),
    ('quarter_final_grades', 'quarter_final_grades_unique_student_term_year', 'constraint',
     'academic_year_id,student_id,subject_id,teacher_id,course_id,term',
     'quarter_final_grades_school_term_uidx',
     'school_id,academic_year_id,student_id,subject_id,teacher_id,course_id,term'),
    ('term_subject_grades', 'term_subject_grades_unique_student_subject_term_year', 'constraint',
     'academic_year_id,student_id,subject_id,term',
     'term_subject_grades_school_term_uidx',
     'school_id,academic_year_id,student_id,subject_id,term'),
    ('evaluation_publications', 'evaluation_publications_unique_course_term_year', 'constraint',
     'academic_year_id,course_id,term',
     'evaluation_publications_school_term_uidx',
     'school_id,academic_year_id,course_id,term'),
    ('annual_evaluation_weights', 'annual_weights_unique_year', 'constraint',
     'academic_year_id,teacher_id,course_id,subject_id',
     'annual_weights_school_uidx',
     'school_id,academic_year_id,teacher_id,course_id,subject_id'),
    ('final_course_grades', 'final_course_grades_unique_year', 'constraint',
     'academic_year_id,student_id,subject_id',
     'final_course_grades_school_uidx',
     'school_id,academic_year_id,student_id,subject_id'),
    ('final_evaluation_publications', 'final_evaluation_publications_unique_course_year', 'constraint',
     'academic_year_id,course_id',
     'final_publications_school_uidx',
     'school_id,academic_year_id,course_id')
)
select
  expected.*,
  legacy_index.oid is not null as legacy_present,
  case when legacy_constraint.oid is null then 'index' else 'constraint' end
    as actual_legacy_kind,
  expected.legacy_kind = case
    when legacy_constraint.oid is null then 'index'
    else 'constraint'
  end as legacy_kind_matches,
  tenant_index.oid is not null as tenant_present,
  coalesce(tenant_metadata.indisunique, false) as tenant_unique,
  coalesce(tenant_metadata.indisvalid, false) as tenant_valid,
  coalesce(tenant_metadata.indisready, false) as tenant_ready,
  tenant_metadata.indpred is null as tenant_not_partial,
  tenant_metadata.indexprs is null as tenant_plain_columns,
  pg_get_indexdef(legacy_index.oid) as legacy_definition,
  pg_get_indexdef(tenant_index.oid) as tenant_definition
from expected
left join pg_namespace public_namespace
  on public_namespace.nspname = 'public'
left join pg_class legacy_index
  on legacy_index.relnamespace = public_namespace.oid
 and legacy_index.relname = expected.legacy_object
left join pg_class tenant_index
  on tenant_index.relnamespace = public_namespace.oid
 and tenant_index.relname = expected.tenant_object
left join pg_constraint legacy_constraint
  on legacy_constraint.conindid = legacy_index.oid
left join pg_index tenant_metadata
  on tenant_metadata.indexrelid = tenant_index.oid
order by expected.table_name;

-- 2. Exact inventory of non-primary unique objects on the eight tables.
select
  table_class.relname as table_name,
  index_class.relname as unique_object,
  case when backing_constraint.oid is null
    then 'unique_index'
    else 'unique_constraint'
  end as object_type,
  coalesce(backing_constraint.conname, '') as constraint_name,
  index_metadata.indisvalid,
  index_metadata.indisready,
  pg_get_indexdef(index_class.oid) as definition
from pg_index index_metadata
join pg_class index_class
  on index_class.oid = index_metadata.indexrelid
join pg_class table_class
  on table_class.oid = index_metadata.indrelid
join pg_namespace table_namespace
  on table_namespace.oid = table_class.relnamespace
left join pg_constraint backing_constraint
  on backing_constraint.conindid = index_class.oid
where table_namespace.nspname = 'public'
  and table_class.relname in (
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  )
  and index_metadata.indisunique
  and not index_metadata.indisprimary
order by table_class.relname, index_class.relname;

-- 3. PostgreSQL dependencies. Internal backing indexes are expected for the
-- seven legacy UNIQUE constraints; no other dependent object is expected.
with legacy(name, oid) as (
  select index_class.relname, index_class.oid
  from pg_class index_class
  join pg_namespace object_namespace
    on object_namespace.oid = index_class.relnamespace
  where object_namespace.nspname = 'public'
    and index_class.relname in (
      'partial_grades_unique_assessment_year_idx',
      'evaluation_criteria_unique_name_year',
      'quarter_final_grades_unique_student_term_year',
      'term_subject_grades_unique_student_subject_term_year',
      'evaluation_publications_unique_course_term_year',
      'annual_weights_unique_year',
      'final_course_grades_unique_year',
      'final_evaluation_publications_unique_course_year'
    )
  union all
  select constraint_data.conname, constraint_data.oid
  from pg_constraint constraint_data
  join pg_namespace object_namespace
    on object_namespace.oid = constraint_data.connamespace
  where object_namespace.nspname = 'public'
    and constraint_data.conname in (
      'evaluation_criteria_unique_name_year',
      'quarter_final_grades_unique_student_term_year',
      'term_subject_grades_unique_student_subject_term_year',
      'evaluation_publications_unique_course_term_year',
      'annual_weights_unique_year',
      'final_course_grades_unique_year',
      'final_evaluation_publications_unique_course_year'
    )
)
select distinct
  legacy.name as legacy_object,
  pg_describe_object(dependency.classid, dependency.objid, dependency.objsubid)
    as dependent_object,
  dependency.deptype
from legacy
join pg_depend dependency
  on dependency.refobjid = legacy.oid
where not (
  dependency.classid = 'pg_class'::regclass
  and dependency.objid = legacy.oid
)
order by legacy.name, dependent_object;

-- 4. Functions, procedures, views and materialized views that name a legacy
-- object. Every count must be zero.
select
  (
    select count(*)
    from pg_proc procedure_data
    join pg_namespace object_namespace
      on object_namespace.oid = procedure_data.pronamespace
    where object_namespace.nspname = 'public'
      and procedure_data.prokind in ('f', 'p')
      and (
        lower(pg_get_functiondef(procedure_data.oid)) like '%partial_grades_unique_assessment_year_idx%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%evaluation_criteria_unique_name_year%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%quarter_final_grades_unique_student_term_year%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%term_subject_grades_unique_student_subject_term_year%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%evaluation_publications_unique_course_term_year%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%annual_weights_unique_year%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%final_course_grades_unique_year%'
        or lower(pg_get_functiondef(procedure_data.oid)) like '%final_evaluation_publications_unique_course_year%'
      )
  ) as function_references,
  (
    select count(*)
    from pg_views
    where schemaname not in ('pg_catalog', 'information_schema')
      and (
        lower(definition) like '%partial_grades_unique_assessment_year_idx%'
        or lower(definition) like '%evaluation_criteria_unique_name_year%'
        or lower(definition) like '%quarter_final_grades_unique_student_term_year%'
        or lower(definition) like '%term_subject_grades_unique_student_subject_term_year%'
        or lower(definition) like '%evaluation_publications_unique_course_term_year%'
        or lower(definition) like '%annual_weights_unique_year%'
        or lower(definition) like '%final_course_grades_unique_year%'
        or lower(definition) like '%final_evaluation_publications_unique_course_year%'
      )
  ) as view_references,
  (
    select count(*)
    from pg_matviews
    where schemaname not in ('pg_catalog', 'information_schema')
      and (
        lower(definition) like '%partial_grades_unique_assessment_year_idx%'
        or lower(definition) like '%evaluation_criteria_unique_name_year%'
        or lower(definition) like '%quarter_final_grades_unique_student_term_year%'
        or lower(definition) like '%term_subject_grades_unique_student_subject_term_year%'
        or lower(definition) like '%evaluation_publications_unique_course_term_year%'
        or lower(definition) like '%annual_weights_unique_year%'
        or lower(definition) like '%final_course_grades_unique_year%'
        or lower(definition) like '%final_evaluation_publications_unique_course_year%'
      )
  ) as materialized_view_references,
  to_regclass('cron.job') is not null as cron_catalog_present;

-- 5. Integrity and duplicate preflight. Every count must be zero.
select 'partial_grades' as table_name,
  count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id) as year_school_mismatches,
  (select count(*) from (select school_id, academic_year_id, student_id, subject_id, term, assessment_type, assessment_name from public.partial_grades group by 1,2,3,4,5,6,7 having count(*) > 1) duplicates) as tenant_duplicates
from public.partial_grades row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'evaluation_criteria', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, teacher_id, course_id, subject_id, term, name from public.evaluation_criteria group by 1,2,3,4,5,6,7 having count(*) > 1) duplicates) from public.evaluation_criteria row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'quarter_final_grades', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, student_id, subject_id, teacher_id, course_id, term from public.quarter_final_grades group by 1,2,3,4,5,6,7 having count(*) > 1) duplicates) from public.quarter_final_grades row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'term_subject_grades', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, student_id, subject_id, term from public.term_subject_grades group by 1,2,3,4,5 having count(*) > 1) duplicates) from public.term_subject_grades row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'evaluation_publications', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, course_id, term from public.evaluation_publications group by 1,2,3,4 having count(*) > 1) duplicates) from public.evaluation_publications row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'annual_evaluation_weights', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, teacher_id, course_id, subject_id from public.annual_evaluation_weights group by 1,2,3,4,5 having count(*) > 1) duplicates) from public.annual_evaluation_weights row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'final_course_grades', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, student_id, subject_id from public.final_course_grades group by 1,2,3,4 having count(*) > 1) duplicates) from public.final_course_grades row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
union all select 'final_evaluation_publications', count(*) filter (where academic_year.id is null or academic_year.school_id <> row_data.school_id), (select count(*) from (select school_id, academic_year_id, course_id from public.final_evaluation_publications group by 1,2,3 having count(*) > 1) duplicates) from public.final_evaluation_publications row_data left join public.academic_years academic_year on academic_year.id = row_data.academic_year_id
order by table_name;

-- 6. Observed ON CONFLICT usage. This is supporting evidence, not a complete
-- external-client registry. It must not replace repository/catalog review.
select
  coalesce(sum(calls) filter (
    where lower(query) like '%on conflict%'
      and (
        lower(query) like '%partial_grades%'
        or lower(query) like '%evaluation_criteria%'
        or lower(query) like '%quarter_final_grades%'
        or lower(query) like '%term_subject_grades%'
        or lower(query) like '%evaluation_publications%'
        or lower(query) like '%annual_evaluation_weights%'
        or lower(query) like '%final_course_grades%'
        or lower(query) like '%final_evaluation_publications%'
      )
  ), 0) as academic_conflict_calls,
  coalesce(sum(calls) filter (
    where lower(query) like '%on conflict%school_id%academic_year_id%'
  ), 0) as tenant_aware_conflict_calls,
  coalesce(sum(calls) filter (
    where lower(query) like '%on conflict%'
      and lower(query) not like '%on conflict%school_id%'
      and (
        lower(query) like '%partial_grades%'
        or lower(query) like '%evaluation_criteria%'
        or lower(query) like '%quarter_final_grades%'
        or lower(query) like '%term_subject_grades%'
        or lower(query) like '%evaluation_publications%'
        or lower(query) like '%annual_evaluation_weights%'
        or lower(query) like '%final_course_grades%'
        or lower(query) like '%final_evaluation_publications%'
      )
  ), 0) as non_tenant_conflict_calls
from extensions.pg_stat_statements;

-- 7. Compact final verdict. This is the result returned by Management API
-- clients that expose only the last result set.
with expected_legacy(object_name) as (
  values
    ('partial_grades_unique_assessment_year_idx'),
    ('evaluation_criteria_unique_name_year'),
    ('quarter_final_grades_unique_student_term_year'),
    ('term_subject_grades_unique_student_subject_term_year'),
    ('evaluation_publications_unique_course_term_year'),
    ('annual_weights_unique_year'),
    ('final_course_grades_unique_year'),
    ('final_evaluation_publications_unique_course_year')
),
expected_tenant(object_name) as (
  values
    ('partial_grades_school_assessment_uidx'),
    ('evaluation_criteria_school_name_uidx'),
    ('quarter_final_grades_school_term_uidx'),
    ('term_subject_grades_school_term_uidx'),
    ('evaluation_publications_school_term_uidx'),
    ('annual_weights_school_uidx'),
    ('final_course_grades_school_uidx'),
    ('final_publications_school_uidx')
),
legacy_count as (
  select count(index_class.oid) as present
  from expected_legacy
  left join pg_namespace object_namespace
    on object_namespace.nspname = 'public'
  left join pg_class index_class
    on index_class.relnamespace = object_namespace.oid
   and index_class.relname = expected_legacy.object_name
),
tenant_state as (
  select
    count(index_class.oid) as present,
    count(*) filter (
      where index_class.oid is null
         or not index_metadata.indisunique
         or not index_metadata.indisvalid
         or not index_metadata.indisready
         or index_metadata.indpred is not null
         or index_metadata.indexprs is not null
    ) as invalid
  from expected_tenant
  left join pg_namespace object_namespace
    on object_namespace.nspname = 'public'
  left join pg_class index_class
    on index_class.relnamespace = object_namespace.oid
   and index_class.relname = expected_tenant.object_name
  left join pg_index index_metadata
    on index_metadata.indexrelid = index_class.oid
),
function_references as (
  select count(*) as total
  from pg_proc procedure_data
  join pg_namespace object_namespace
    on object_namespace.oid = procedure_data.pronamespace
  where object_namespace.nspname = 'public'
    and procedure_data.prokind in ('f', 'p')
    and (
      lower(pg_get_functiondef(procedure_data.oid)) like '%partial_grades_unique_assessment_year_idx%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%evaluation_criteria_unique_name_year%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%quarter_final_grades_unique_student_term_year%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%term_subject_grades_unique_student_subject_term_year%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%evaluation_publications_unique_course_term_year%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%annual_weights_unique_year%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%final_course_grades_unique_year%'
      or lower(pg_get_functiondef(procedure_data.oid)) like '%final_evaluation_publications_unique_course_year%'
    )
),
statement_usage as (
  select
    coalesce(sum(calls) filter (
      where lower(query) like '%on conflict%'
        and lower(query) not like '%on conflict%school_id%'
        and (
          lower(query) like '%partial_grades%'
          or lower(query) like '%evaluation_criteria%'
          or lower(query) like '%quarter_final_grades%'
          or lower(query) like '%term_subject_grades%'
          or lower(query) like '%evaluation_publications%'
          or lower(query) like '%annual_evaluation_weights%'
          or lower(query) like '%final_course_grades%'
          or lower(query) like '%final_evaluation_publications%'
        )
    ), 0) as non_tenant_calls
  from extensions.pg_stat_statements
)
select
  legacy_count.present as legacy_objects_present,
  tenant_state.present as tenant_objects_present,
  tenant_state.invalid as invalid_tenant_objects,
  function_references.total as function_references,
  statement_usage.non_tenant_calls as observed_non_tenant_conflict_calls,
  (
    legacy_count.present = 8
    and tenant_state.present = 8
    and tenant_state.invalid = 0
    and function_references.total = 0
    and statement_usage.non_tenant_calls = 0
  ) as ready_for_staging_removal_rehearsal
from legacy_count, tenant_state, function_references, statement_usage;
