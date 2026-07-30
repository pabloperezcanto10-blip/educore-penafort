-- SPRINT 20.2J / 039B postflight
-- STAGING ONLY. Structural and authorization assertions; no data changes.

do $postflight$
declare
  target_tables constant text[] := array[
    'annual_evaluation_weights',
    'evaluation_criteria',
    'evaluation_publications',
    'final_course_grades',
    'final_evaluation_publications',
    'partial_grades',
    'quarter_final_grades',
    'term_subject_grades'
  ];
  academic_helpers constant text[] := array[
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
    'academic_school_is_active'
  ];
begin
  if (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(target_tables)
      and relation.relrowsecurity
  ) <> 8 then
    raise exception '039B postflight: RLS is not enabled on all eight tables.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
  ) <> 36 then
    raise exception '039B postflight: expected 36 policies.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
      and (
        coalesce(qual, '') ilike '%current_user_has_role%'
        or coalesce(with_check, '') ilike '%current_user_has_role%'
        or coalesce(qual, '') ilike '%profiles.role%'
        or coalesce(with_check, '') ilike '%profiles.role%'
        or regexp_replace(coalesce(qual, ''), '[[:space:]()]', '', 'g') = 'true'
        or regexp_replace(coalesce(with_check, ''), '[[:space:]()]', '', 'g') = 'true'
      )
  ) then
    raise exception '039B postflight: an unsafe policy expression remains.';
  end if;

  if exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = any(target_tables)
      and grantee = 'anon'
  ) then
    raise exception '039B postflight: anon retains an academic table grant.';
  end if;

  if (
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = any(target_tables)
      and grantee = 'authenticated'
  ) <> 31 then
    raise exception '039B postflight: authenticated grants are not the expected minimum set.';
  end if;

  if exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = any(target_tables)
      and grantee = 'authenticated'
      and privilege_type in ('REFERENCES', 'TRIGGER', 'TRUNCATE')
  ) then
    raise exception '039B postflight: authenticated retains a structural privilege.';
  end if;

  if (
    select count(*)
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = any(academic_helpers)
      and procedure.prosecdef
      and procedure.proconfig::text like '%search_path=%'
  ) <> 16 then
    raise exception '039B postflight: academic helpers are missing or lack a fixed search_path.';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and (
        has_function_privilege('public', procedure.oid, 'EXECUTE')
        or has_function_privilege('anon', procedure.oid, 'EXECUTE')
      )
  ) then
    raise exception '039B postflight: a SECURITY DEFINER function is public or anonymous.';
  end if;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(target_tables)
      and column_name = 'school_id'
      and is_nullable = 'NO'
  ) <> 8 then
    raise exception '039B postflight: a 039A school_id constraint changed.';
  end if;

  if (
    select count(*)
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
  ) <> 40 then
    raise exception '039B postflight: a 039A tenant foreign key changed.';
  end if;

  if (
    select count(distinct event_object_table || ':' || trigger_name)
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = any(target_tables)
      and trigger_name like 'zz_%_school_context'
  ) <> 8 then
    raise exception '039B postflight: a 039A structural trigger changed.';
  end if;
end
$postflight$;

select
  tablename,
  count(*) as policy_count
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
group by tablename
order by tablename;

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
  and procedure.proname like 'academic_%'
order by routine;

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
