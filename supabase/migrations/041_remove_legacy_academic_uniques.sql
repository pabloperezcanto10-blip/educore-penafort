-- STAGING FIRST - SPRINT 20.2L2
-- Remove only the eight audited legacy academic uniqueness objects.
-- Tenant-aware replacements, data, RLS, grants, triggers and columns remain intact.

begin;

lock table public.partial_grades in access exclusive mode;
lock table public.evaluation_criteria in access exclusive mode;
lock table public.quarter_final_grades in access exclusive mode;
lock table public.term_subject_grades in access exclusive mode;
lock table public.evaluation_publications in access exclusive mode;
lock table public.annual_evaluation_weights in access exclusive mode;
lock table public.final_course_grades in access exclusive mode;
lock table public.final_evaluation_publications in access exclusive mode;

do $preconditions$
declare
  invalid_tenant_indexes text;
  missing_legacy_constraints text;
  invalid_context_columns integer;
  invalid_year_school_fks integer;
begin
  with expected(table_name, index_name) as (
    values
      ('partial_grades', 'partial_grades_school_assessment_uidx'),
      ('evaluation_criteria', 'evaluation_criteria_school_name_uidx'),
      ('quarter_final_grades', 'quarter_final_grades_school_term_uidx'),
      ('term_subject_grades', 'term_subject_grades_school_term_uidx'),
      ('evaluation_publications', 'evaluation_publications_school_term_uidx'),
      ('annual_evaluation_weights', 'annual_weights_school_uidx'),
      ('final_course_grades', 'final_course_grades_school_uidx'),
      ('final_evaluation_publications', 'final_publications_school_uidx')
  )
  select string_agg(expected.index_name, ', ' order by expected.index_name)
  into invalid_tenant_indexes
  from expected
  left join pg_class table_class
    on table_class.relname = expected.table_name
  left join pg_namespace table_namespace
    on table_namespace.oid = table_class.relnamespace
   and table_namespace.nspname = 'public'
  left join pg_class index_class
    on index_class.relname = expected.index_name
   and index_class.relnamespace = table_namespace.oid
  left join pg_index index_metadata
    on index_metadata.indexrelid = index_class.oid
   and index_metadata.indrelid = table_class.oid
  where table_class.oid is null
     or index_class.oid is null
     or not index_metadata.indisunique
     or not index_metadata.indisvalid
     or not index_metadata.indisready
     or index_metadata.indpred is not null
     or index_metadata.indexprs is not null;

  if invalid_tenant_indexes is not null then
    raise exception 'Refusing 041: missing or invalid tenant-aware indexes: %', invalid_tenant_indexes;
  end if;

  if to_regclass('public.partial_grades_unique_assessment_year_idx') is null then
    raise exception 'Refusing 041: legacy partial-grades index is missing.';
  end if;

  with expected(table_name, constraint_name, constraint_definition) as (
    values
      ('evaluation_criteria', 'evaluation_criteria_unique_name_year',
       'UNIQUE (academic_year_id, teacher_id, course_id, subject_id, term, name)'),
      ('quarter_final_grades', 'quarter_final_grades_unique_student_term_year',
       'UNIQUE (academic_year_id, student_id, subject_id, teacher_id, course_id, term)'),
      ('term_subject_grades', 'term_subject_grades_unique_student_subject_term_year',
       'UNIQUE (academic_year_id, student_id, subject_id, term)'),
      ('evaluation_publications', 'evaluation_publications_unique_course_term_year',
       'UNIQUE (academic_year_id, course_id, term)'),
      ('annual_evaluation_weights', 'annual_weights_unique_year',
       'UNIQUE (academic_year_id, teacher_id, course_id, subject_id)'),
      ('final_course_grades', 'final_course_grades_unique_year',
       'UNIQUE (academic_year_id, student_id, subject_id)'),
      ('final_evaluation_publications', 'final_evaluation_publications_unique_course_year',
       'UNIQUE (academic_year_id, course_id)')
  )
  select string_agg(expected.constraint_name, ', ' order by expected.constraint_name)
  into missing_legacy_constraints
  from expected
  left join pg_class table_class
    on table_class.relname = expected.table_name
  left join pg_namespace table_namespace
    on table_namespace.oid = table_class.relnamespace
   and table_namespace.nspname = 'public'
  left join pg_constraint constraint_data
    on constraint_data.conrelid = table_class.oid
   and constraint_data.conname = expected.constraint_name
   and constraint_data.contype = 'u'
  where constraint_data.oid is null
     or pg_get_constraintdef(constraint_data.oid, true) <> expected.constraint_definition;

  if missing_legacy_constraints is not null then
    raise exception 'Refusing 041: missing or changed legacy constraints: %', missing_legacy_constraints;
  end if;

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
    raise exception 'Refusing 041: an academic tenant-context column is missing or nullable.';
  end if;

  select 8 - count(*)
  into invalid_year_school_fks
  from pg_constraint constraint_data
  join pg_class table_class on table_class.oid = constraint_data.conrelid
  join pg_namespace table_namespace on table_namespace.oid = table_class.relnamespace
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
    raise exception 'Refusing 041: a validated academic-year/school FK is missing.';
  end if;

  if exists (
    select 1 from public.partial_grades
    group by academic_year_id, student_id, subject_id, term, assessment_type, assessment_name
    having count(*) > 1
  ) or exists (
    select 1 from public.evaluation_criteria
    group by academic_year_id, teacher_id, course_id, subject_id, term, name
    having count(*) > 1
  ) or exists (
    select 1 from public.quarter_final_grades
    group by academic_year_id, student_id, subject_id, teacher_id, course_id, term
    having count(*) > 1
  ) or exists (
    select 1 from public.term_subject_grades
    group by academic_year_id, student_id, subject_id, term
    having count(*) > 1
  ) or exists (
    select 1 from public.evaluation_publications
    group by academic_year_id, course_id, term
    having count(*) > 1
  ) or exists (
    select 1 from public.annual_evaluation_weights
    group by academic_year_id, teacher_id, course_id, subject_id
    having count(*) > 1
  ) or exists (
    select 1 from public.final_course_grades
    group by academic_year_id, student_id, subject_id
    having count(*) > 1
  ) or exists (
    select 1 from public.final_evaluation_publications
    group by academic_year_id, course_id
    having count(*) > 1
  ) then
    raise exception 'Refusing 041: incompatible academic duplicates exist.';
  end if;
end
$preconditions$;

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

do $postconditions$
begin
  if (
    select count(*)
    from pg_class object_class
    join pg_namespace object_namespace on object_namespace.oid = object_class.relnamespace
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
  ) <> 0 then
    raise exception 'Migration 041 left a legacy academic uniqueness object behind.';
  end if;

  if (
    select count(*)
    from pg_class index_class
    join pg_namespace index_namespace on index_namespace.oid = index_class.relnamespace
    join pg_index index_metadata on index_metadata.indexrelid = index_class.oid
    where index_namespace.nspname = 'public'
      and index_class.relname in (
        'partial_grades_school_assessment_uidx',
        'evaluation_criteria_school_name_uidx',
        'quarter_final_grades_school_term_uidx',
        'term_subject_grades_school_term_uidx',
        'evaluation_publications_school_term_uidx',
        'annual_weights_school_uidx',
        'final_course_grades_school_uidx',
        'final_publications_school_uidx'
      )
      and index_metadata.indisunique
      and index_metadata.indisvalid
      and index_metadata.indisready
      and index_metadata.indpred is null
      and index_metadata.indexprs is null
  ) <> 8 then
    raise exception 'Migration 041 damaged a tenant-aware academic unique index.';
  end if;
end
$postconditions$;

commit;
