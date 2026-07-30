-- Sprint 20.2H
-- Read-only inventory for production, staging and future postflight.
-- This file intentionally contains SELECT statements only.

-- PRODUCTION READ-ONLY / STAGING
-- Aggregate row inventory. No personal or academic values are returned.
select 'academic_years' as relation_name, count(*)::bigint as row_count
from public.academic_years
union all
select 'courses', count(*) from public.courses
union all
select 'subjects', count(*) from public.subjects
union all
select 'course_subjects', count(*) from public.course_subjects
union all
select 'students', count(*) from public.students
union all
select 'teacher_assignments', count(*) from public.teacher_assignments
union all
select 'partial_grades', count(*) from public.partial_grades
union all
select 'evaluation_criteria', count(*) from public.evaluation_criteria
union all
select 'quarter_final_grades', count(*) from public.quarter_final_grades
union all
select 'term_subject_grades', count(*) from public.term_subject_grades
union all
select 'evaluation_publications', count(*) from public.evaluation_publications
union all
select 'annual_evaluation_weights', count(*) from public.annual_evaluation_weights
union all
select 'final_course_grades', count(*) from public.final_course_grades
union all
select 'final_evaluation_publications', count(*) from public.final_evaluation_publications
order by relation_name;

-- STAGING / FUTURE POSTFLIGHT
-- Column presence. Production before 034-038 is expected to report false.
select
  table_name,
  bool_or(column_name = 'school_id') as has_school_id,
  bool_or(column_name = 'academic_year_id') as has_academic_year_id
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
group by table_name
order by table_name;

-- Current primary keys, foreign keys and unique constraints.
select
  constraint_table.relname as table_name,
  constraint_data.conname as constraint_name,
  case constraint_data.contype
    when 'p' then 'primary_key'
    when 'f' then 'foreign_key'
    when 'u' then 'unique'
    when 'c' then 'check'
    else constraint_data.contype::text
  end as constraint_type
from pg_constraint constraint_data
join pg_class constraint_table
  on constraint_table.oid = constraint_data.conrelid
join pg_namespace table_namespace
  on table_namespace.oid = constraint_table.relnamespace
where table_namespace.nspname = 'public'
  and constraint_table.relname in (
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  )
order by table_name, constraint_type, constraint_name;

-- Current indexes.
select
  tablename as table_name,
  indexname as index_name
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  )
order by table_name, index_name;

-- Current RLS policies.
select
  tablename as table_name,
  policyname as policy_name,
  cmd as command,
  roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  )
order by table_name, command, policy_name;

-- Current triggers.
select
  event_object_table as table_name,
  trigger_name,
  event_manipulation
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  )
order by table_name, trigger_name, event_manipulation;
