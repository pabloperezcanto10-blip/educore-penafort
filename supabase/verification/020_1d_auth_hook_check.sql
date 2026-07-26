-- Read-only check for the application-owned Auth hook.
-- It returns metadata only and never reads auth.users rows.

select json_build_object(
  'on_auth_user_created_exists',
  exists (
    select 1
    from pg_trigger trigger
    join pg_class relation on relation.oid = trigger.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relname = 'users'
      and trigger.tgname = 'on_auth_user_created'
      and not trigger.tgisinternal
  )
) as auth_hook_check;
