-- Read-only preflight for an isolated staging project.

select json_build_object(
  'public_tables',
  (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  ),
  'auth_users',
  (select count(*) from auth.users),
  'migration_history_exists',
  to_regclass('supabase_migrations.schema_migrations') is not null,
  'schools_exists',
  to_regclass('public.schools') is not null,
  'school_memberships_exists',
  to_regclass('public.school_memberships') is not null
) as staging_preflight;
