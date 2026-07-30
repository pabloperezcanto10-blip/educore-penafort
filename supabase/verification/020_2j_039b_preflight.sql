-- SPRINT 20.2J / 039B preflight
-- STAGING ONLY. SELECT-only inventory; this script never changes data.

select
  'TARGET ENVIRONMENT' as check_name,
  'STAGING' as result
union all
select
  'PROJECT REF',
  'zhnbrpcekmxldxlqrbhr';

select
  relation.relname as table_name,
  relation.relrowsecurity as rls_enabled,
  relation.relforcerowsecurity as rls_forced,
  count(distinct policy.policyname) as policy_count,
  count(distinct privilege.grantee || ':' || privilege.privilege_type) as grant_count
from pg_class relation
join pg_namespace namespace
  on namespace.oid = relation.relnamespace
left join pg_policies policy
  on policy.schemaname = namespace.nspname
 and policy.tablename = relation.relname
left join information_schema.table_privileges privilege
  on privilege.table_schema = namespace.nspname
 and privilege.table_name = relation.relname
where namespace.nspname = 'public'
  and relation.relname in (
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  )
group by relation.relname, relation.relrowsecurity, relation.relforcerowsecurity
order by relation.relname;

select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
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
order by tablename, cmd, policyname;

select
  table_name,
  grantee,
  string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.table_privileges
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
group by table_name, grantee
order by table_name, grantee;

select
  procedure.oid::regprocedure::text as routine,
  procedure.prosecdef as security_definer,
  procedure.proconfig as runtime_config,
  has_function_privilege('public', procedure.oid, 'EXECUTE') as public_execute,
  has_function_privilege('anon', procedure.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', procedure.oid, 'EXECUTE') as authenticated_execute
from pg_proc procedure
join pg_namespace namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and (
    procedure.prosecdef
    or procedure.proname in (
      'active_academic_year_id',
      'set_default_academic_year_id'
    )
  )
order by routine;

select
  'using_true' as risk,
  count(*) as occurrences
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
  and (
    regexp_replace(coalesce(qual, ''), '[[:space:]()]', '', 'g') = 'true'
    or regexp_replace(coalesce(with_check, ''), '[[:space:]()]', '', 'g') = 'true'
  )
union all
select
  'legacy_global_role_helper',
  count(*)
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
  and (
    coalesce(qual, '') ilike '%current_user_has_role%'
    or coalesce(with_check, '') ilike '%current_user_has_role%'
  )
union all
select
  'anon_table_grants',
  count(*)
from information_schema.table_privileges
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
  and grantee = 'anon'
union all
select
  'security_definer_public_or_anon',
  count(*)
from pg_proc procedure
join pg_namespace namespace
  on namespace.oid = procedure.pronamespace
where namespace.nspname = 'public'
  and procedure.prosecdef
  and (
    has_function_privilege('public', procedure.oid, 'EXECUTE')
    or has_function_privilege('anon', procedure.oid, 'EXECUTE')
  );

select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  string_agg(event_manipulation, ',' order by event_manipulation) as events,
  action_statement
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
group by event_object_table, trigger_name, action_timing, action_statement
order by event_object_table, trigger_name;

select
  '039a_not_null_school_columns' as check_name,
  count(*) as result
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
  and column_name = 'school_id'
  and is_nullable = 'NO'
union all
select
  '039a_tenant_foreign_keys',
  count(*)
from pg_constraint
where contype = 'f'
  and conrelid in (
    'public.partial_grades'::regclass,
    'public.evaluation_criteria'::regclass,
    'public.quarter_final_grades'::regclass,
    'public.term_subject_grades'::regclass,
    'public.evaluation_publications'::regclass,
    'public.annual_evaluation_weights'::regclass,
    'public.final_course_grades'::regclass,
    'public.final_evaluation_publications'::regclass
  )
  and conname like '%school%fkey'
union all
select
  '039a_structural_triggers',
  count(distinct event_object_table || ':' || trigger_name)
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
  and trigger_name like 'zz_%_school_context';

select
  'annual_evaluation_weights' as table_name,
  count(*) as row_count
from public.annual_evaluation_weights
union all
select 'evaluation_criteria', count(*) from public.evaluation_criteria
union all
select 'evaluation_publications', count(*) from public.evaluation_publications
union all
select 'final_course_grades', count(*) from public.final_course_grades
union all
select 'final_evaluation_publications', count(*) from public.final_evaluation_publications
union all
select 'partial_grades', count(*) from public.partial_grades
union all
select 'quarter_final_grades', count(*) from public.quarter_final_grades
union all
select 'term_subject_grades', count(*) from public.term_subject_grades
order by table_name;
