-- Sprint 20.2M2B - legacy production baseline fingerprint.
-- STRICTLY READ ONLY: catalog metadata and aggregate counts only.
-- Run on an isolated restored clone before reconciling migration history.

with expected_tables(table_name) as (
  values
    ('academic_years'),
    ('annual_evaluation_weights'),
    ('attendance_records'),
    ('audit_logs'),
    ('course_subjects'),
    ('courses'),
    ('evaluation_criteria'),
    ('evaluation_publications'),
    ('families'),
    ('final_course_grades'),
    ('final_evaluation_publications'),
    ('internal_notifications'),
    ('notifications'),
    ('parent_students'),
    ('partial_grades'),
    ('profiles'),
    ('quarter_final_grades'),
    ('student_attendance'),
    ('student_families'),
    ('student_incidents'),
    ('student_observations'),
    ('students'),
    ('subjects'),
    ('teacher_assignments'),
    ('teacher_schedule'),
    ('teachers'),
    ('term_subject_grades')
),
expected_functions(function_name) as (
  values
    ('active_academic_year_id'),
    ('current_user_has_role'),
    ('handle_new_user'),
    ('set_attendance_records_updated_at'),
    ('set_default_academic_year_id'),
    ('set_evaluation_publications_updated_at'),
    ('set_term_subject_grades_updated_at'),
    ('set_updated_at')
),
metrics as (
  select 'catalog'::text as category, 'public_tables'::text as metric,
    count(*)::bigint as total, 'must_be_27'::text as expectation
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')

  union all
  select 'catalog', 'missing_expected_tables', count(*)::bigint, 'must_be_0'
  from expected_tables expected
  where to_regclass(format('public.%I', expected.table_name)) is null

  union all
  select 'catalog', 'unexpected_public_tables', count(*)::bigint, 'must_be_0'
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and not exists (
      select 1 from expected_tables expected
      where expected.table_name = relation.relname
    )

  union all
  select 'catalog', 'constraints', count(*)::bigint, 'must_be_145'
  from pg_constraint constraint_row
  join pg_namespace namespace on namespace.oid = constraint_row.connamespace
  where namespace.nspname = 'public'

  union all
  select 'catalog', 'indexes', count(*)::bigint, 'must_be_90'
  from pg_indexes where schemaname = 'public'

  union all
  select 'catalog', 'policies', count(*)::bigint, 'must_be_100'
  from pg_policies where schemaname = 'public'

  union all
  select 'catalog', 'public_functions', count(*)::bigint, 'must_be_8'
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.prokind = 'f'

  union all
  select 'catalog', 'missing_expected_functions', count(*)::bigint, 'must_be_0'
  from expected_functions expected
  where not exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = expected.function_name
  )

  union all
  select 'catalog', 'non_internal_public_triggers', count(*)::bigint, 'must_be_22'
  from pg_trigger trigger_row
  join pg_class relation on relation.oid = trigger_row.tgrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and trigger_row.tgisinternal is false

  union all
  select 'security', 'public_tables_with_rls_disabled', count(*)::bigint, 'must_be_0'
  from pg_class relation
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and relation.relrowsecurity is false

  union all
  select 'identity', 'app_role_values', count(*)::bigint, 'must_be_4'
  from pg_enum enum_row
  join pg_type type_row on type_row.oid = enum_row.enumtypid
  join pg_namespace namespace on namespace.oid = type_row.typnamespace
  where namespace.nspname = 'public'
    and type_row.typname = 'app_role'

  union all
  select 'identity', 'auth_profile_hook_present', count(*)::bigint, 'must_be_1'
  from pg_trigger trigger_row
  join pg_class relation on relation.oid = trigger_row.tgrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'auth'
    and relation.relname = 'users'
    and trigger_row.tgname = 'on_auth_user_created'
    and trigger_row.tgisinternal is false

  union all
  select 'multitenant', 'schools_table_present',
    (to_regclass('public.schools') is not null)::int::bigint,
    'must_be_0_before_034'

  union all
  select 'multitenant', 'school_memberships_table_present',
    (to_regclass('public.school_memberships') is not null)::int::bigint,
    'must_be_0_before_034'

  union all
  select 'multitenant', 'school_id_columns', count(*)::bigint,
    'must_be_0_before_034'
  from information_schema.columns
  where table_schema = 'public'
    and column_name = 'school_id'
)
select category, metric, total, expectation
from metrics
order by category, metric;
