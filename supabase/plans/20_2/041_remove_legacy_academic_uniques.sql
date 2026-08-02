-- DO NOT APPLY
-- DESIGN ONLY
-- NOT A MIGRATION
-- SPRINT 20.2L1
--
-- This reviewed draft describes the future removal of the eight legacy
-- academic uniqueness objects. It must not be copied into
-- supabase/migrations until Sprint 20.2L2 approves the rehearsal.

/*
begin;

-- PRECONDITIONS
-- 1. All eight tenant-aware business indexes must exist, be unique, valid,
--    ready, non-partial and based on plain columns.
-- 2. school_id and academic_year_id must remain NOT NULL on all eight tables.
-- 3. Every (academic_year_id, school_id) FK must be valid.
-- 4. Repository, PostgreSQL function, view, job and observed-query audits must
--    show no legacy ON CONFLICT consumer.
-- 5. The 20.2L1 SELECT verifier must report zero incompatible duplicates.

do $preconditions$
declare
  missing_indexes text;
begin
  with expected(index_name) as (
    values
      ('partial_grades_school_assessment_uidx'),
      ('evaluation_criteria_school_name_uidx'),
      ('quarter_final_grades_school_term_uidx'),
      ('term_subject_grades_school_term_uidx'),
      ('evaluation_publications_school_term_uidx'),
      ('annual_weights_school_uidx'),
      ('final_course_grades_school_uidx'),
      ('final_publications_school_uidx')
  )
  select string_agg(expected.index_name, ', ' order by expected.index_name)
  into missing_indexes
  from expected
  left join pg_class index_class
    on index_class.relname = expected.index_name
  left join pg_namespace index_namespace
    on index_namespace.oid = index_class.relnamespace
   and index_namespace.nspname = 'public'
  left join pg_index index_metadata
    on index_metadata.indexrelid = index_class.oid
  where index_class.oid is null
     or not index_metadata.indisunique
     or not index_metadata.indisvalid
     or not index_metadata.indisready
     or index_metadata.indpred is not null
     or index_metadata.indexprs is not null;

  if missing_indexes is not null then
    raise exception 'Missing or invalid tenant-aware indexes: %', missing_indexes;
  end if;
end
$preconditions$;

do $context_preconditions$
declare
  invalid_context_columns integer;
  invalid_year_school_fks integer;
  legacy_function_consumers integer;
  observed_legacy_conflicts bigint;
begin
  select 16 - count(*) filter (where is_nullable = 'NO')
  into invalid_context_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name in (
      'partial_grades',
      'evaluation_criteria',
      'quarter_final_grades',
      'term_subject_grades',
      'evaluation_publications',
      'annual_evaluation_weights',
      'final_course_grades',
      'final_evaluation_publications'
    )
    and column_name in ('school_id', 'academic_year_id');

  if invalid_context_columns <> 0 then
    raise exception 'Academic tenant context columns are nullable.';
  end if;

  select 8 - count(*)
  into invalid_year_school_fks
  from pg_constraint constraint_data
  join pg_class table_class
    on table_class.oid = constraint_data.conrelid
  join pg_namespace table_namespace
    on table_namespace.oid = table_class.relnamespace
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
    and constraint_data.contype = 'f'
    and constraint_data.convalidated
    and pg_get_constraintdef(constraint_data.oid, true)
      like 'FOREIGN KEY (academic_year_id, school_id)%';

  if invalid_year_school_fks <> 0 then
    raise exception 'A validated academic year/school FK is missing.';
  end if;

  select count(*)
  into legacy_function_consumers
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
    );

  if legacy_function_consumers <> 0 then
    raise exception 'A PostgreSQL function references legacy uniqueness.';
  end if;

  select coalesce(sum(calls) filter (
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
  ), 0)
  into observed_legacy_conflicts
  from extensions.pg_stat_statements;

  if observed_legacy_conflicts <> 0 then
    raise exception 'Observed academic ON CONFLICT calls still omit school_id.';
  end if;
end
$context_preconditions$;

-- REMOVE ONLY THE EIGHT REVIEWED LEGACY OBJECTS.
drop index public.partial_grades_unique_assessment_year_idx;

alter table public.evaluation_criteria
  drop constraint evaluation_criteria_unique_name_year;
alter table public.quarter_final_grades
  drop constraint quarter_final_grades_unique_student_term_year;
alter table public.term_subject_grades
  drop constraint term_subject_grades_unique_student_subject_term_year;
alter table public.evaluation_publications
  drop constraint evaluation_publications_unique_course_term_year;
alter table public.annual_evaluation_weights
  drop constraint annual_weights_unique_year;
alter table public.final_course_grades
  drop constraint final_course_grades_unique_year;
alter table public.final_evaluation_publications
  drop constraint final_evaluation_publications_unique_course_year;

-- POSTFLIGHT
do $postflight$
begin
  if exists (
    select 1
    from pg_class object_class
    join pg_namespace object_namespace
      on object_namespace.oid = object_class.relnamespace
    where object_namespace.nspname = 'public'
      and object_class.relname in (
        'partial_grades_unique_assessment_year_idx',
        'evaluation_criteria_unique_name_year',
        'quarter_final_grades_unique_student_term_year',
        'term_subject_grades_unique_student_subject_term_year',
        'evaluation_publications_unique_course_term_year',
        'annual_weights_unique_year',
        'final_course_grades_unique_year',
        'final_evaluation_publications_unique_course_year'
      )
  ) then
    raise exception 'A legacy academic uniqueness object remains.';
  end if;
end
$postflight$;

commit;

-- MANUAL ROLLBACK (execute only after a duplicate preflight)
-- create unique index partial_grades_unique_assessment_year_idx
--   on public.partial_grades
--   (academic_year_id, student_id, subject_id, term, assessment_type, assessment_name);
-- alter table public.evaluation_criteria add constraint
--   evaluation_criteria_unique_name_year unique
--   (academic_year_id, teacher_id, course_id, subject_id, term, name);
-- alter table public.quarter_final_grades add constraint
--   quarter_final_grades_unique_student_term_year unique
--   (academic_year_id, student_id, subject_id, teacher_id, course_id, term);
-- alter table public.term_subject_grades add constraint
--   term_subject_grades_unique_student_subject_term_year unique
--   (academic_year_id, student_id, subject_id, term);
-- alter table public.evaluation_publications add constraint
--   evaluation_publications_unique_course_term_year unique
--   (academic_year_id, course_id, term);
-- alter table public.annual_evaluation_weights add constraint
--   annual_weights_unique_year unique
--   (academic_year_id, teacher_id, course_id, subject_id);
-- alter table public.final_course_grades add constraint
--   final_course_grades_unique_year unique
--   (academic_year_id, student_id, subject_id);
-- alter table public.final_evaluation_publications add constraint
--   final_evaluation_publications_unique_course_year unique
--   (academic_year_id, course_id);
*/
