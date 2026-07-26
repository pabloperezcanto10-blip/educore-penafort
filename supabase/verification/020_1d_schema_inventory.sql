-- Read-only structural inventory for the public schema.
-- Safe for production: this file contains one SELECT statement only.

select jsonb_build_object(
  'summary',
  jsonb_build_object(
    'tables',
    (
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
    ),
    'views',
    (
      select count(*)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('v', 'm')
    ),
    'functions',
    (
      select count(*)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    ),
    'policies',
    (
      select count(*)
      from pg_policies
      where schemaname = 'public'
    ),
    'triggers',
    (
      select count(*)
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
    )
  ),
  'tables',
  (
    select coalesce(jsonb_agg(to_jsonb(inventory) order by inventory.table_name), '[]'::jsonb)
    from (
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
    ) inventory
  ),
  'columns',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.table_name, inventory.ordinal_position),
      '[]'::jsonb
    )
    from (
      select
        table_name,
        ordinal_position,
        column_name,
        format_type(attribute.atttypid, attribute.atttypmod) as formatted_type,
        data_type,
        udt_schema,
        udt_name,
        is_nullable,
        column_default,
        is_identity,
        identity_generation,
        is_generated,
        generation_expression,
        collation_name
      from information_schema.columns column_info
      join pg_namespace namespace
        on namespace.nspname = column_info.table_schema
      join pg_class relation
        on relation.relnamespace = namespace.oid
       and relation.relname = column_info.table_name
      join pg_attribute attribute
        on attribute.attrelid = relation.oid
       and attribute.attname = column_info.column_name
       and attribute.attnum > 0
       and not attribute.attisdropped
      where column_info.table_schema = 'public'
    ) inventory
  ),
  'constraints',
  (
    select coalesce(
      jsonb_agg(
        to_jsonb(inventory)
        order by inventory.table_name, inventory.constraint_type, inventory.constraint_name
      ),
      '[]'::jsonb
    )
    from (
      select
        c.relname as table_name,
        con.conname as constraint_name,
        case con.contype
          when 'p' then 'primary_key'
          when 'f' then 'foreign_key'
          when 'u' then 'unique'
          when 'c' then 'check'
          when 'x' then 'exclusion'
          else con.contype::text
        end as constraint_type,
        pg_get_constraintdef(con.oid, true) as definition
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
    ) inventory
  ),
  'indexes',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.table_name, inventory.index_name),
      '[]'::jsonb
    )
    from (
      select
        tablename as table_name,
        indexname as index_name,
        indexdef as definition
      from pg_indexes
      where schemaname = 'public'
    ) inventory
  ),
  'sequences',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.sequence_name),
      '[]'::jsonb
    )
    from (
      select
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      from information_schema.sequences
      where sequence_schema = 'public'
    ) inventory
  ),
  'functions',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.function_signature),
      '[]'::jsonb
    )
    from (
      select
        p.oid::regprocedure::text as function_signature,
        l.lanname as language,
        p.prosecdef as security_definer,
        p.provolatile as volatility,
        pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language l on l.oid = p.prolang
      where n.nspname = 'public'
    ) inventory
  ),
  'triggers',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.table_name, inventory.trigger_name),
      '[]'::jsonb
    )
    from (
      select
        c.relname as table_name,
        t.tgname as trigger_name,
        pg_get_triggerdef(t.oid, true) as definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and not t.tgisinternal
    ) inventory
  ),
  'auth_hooks',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.trigger_name),
      '[]'::jsonb
    )
    from (
      select
        t.tgname as trigger_name,
        pg_get_triggerdef(t.oid, true) as definition
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth'
        and c.relname = 'users'
        and t.tgname = 'on_auth_user_created'
        and not t.tgisinternal
    ) inventory
  ),
  'policies',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.table_name, inventory.policy_name),
      '[]'::jsonb
    )
    from (
      select
        tablename as table_name,
        policyname as policy_name,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname = 'public'
    ) inventory
  ),
  'views',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.view_name),
      '[]'::jsonb
    )
    from (
      select
        c.relname as view_name,
        case c.relkind when 'm' then 'materialized' else 'view' end as view_type,
        pg_get_viewdef(c.oid, true) as definition
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('v', 'm')
    ) inventory
  ),
  'types',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.type_name),
      '[]'::jsonb
    )
    from (
      select
        t.typname as type_name,
        case t.typtype
          when 'e' then 'enum'
          when 'd' then 'domain'
          else t.typtype::text
        end as type_kind,
        case
          when t.typtype = 'e' then (
            select jsonb_agg(e.enumlabel order by e.enumsortorder)
            from pg_enum e
            where e.enumtypid = t.oid
          )
          else null
        end as enum_labels,
        case
          when t.typtype = 'd' then format_type(t.typbasetype, t.typtypmod)
          else null
        end as domain_base_type,
        case
          when t.typtype = 'd' then t.typnotnull
          else null
        end as domain_not_null,
        case
          when t.typtype = 'd' then pg_get_expr(t.typdefaultbin, 0)
          else null
        end as domain_default
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
        and t.typtype in ('e', 'd')
    ) inventory
  ),
  'extensions',
  (
    select coalesce(
      jsonb_agg(to_jsonb(inventory) order by inventory.extension_name),
      '[]'::jsonb
    )
    from (
      select
        e.extname as extension_name,
        e.extversion as version,
        n.nspname as schema_name
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
    ) inventory
  ),
  'grants',
  (
    select coalesce(
      jsonb_agg(
        to_jsonb(inventory)
        order by inventory.table_name, inventory.grantee, inventory.privilege_type
      ),
      '[]'::jsonb
    )
    from (
      select
        grantee,
        table_name,
        privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon', 'authenticated', 'service_role')
    ) inventory
  ),
  'routine_grants',
  (
    select coalesce(
      jsonb_agg(
        to_jsonb(inventory)
        order by inventory.routine_name, inventory.grantee, inventory.privilege_type
      ),
      '[]'::jsonb
    )
    from (
      select
        routine_name,
        specific_name,
        grantee,
        privilege_type
      from information_schema.role_routine_grants
      where specific_schema = 'public'
        and grantee in ('anon', 'authenticated', 'service_role')
    ) inventory
  )
) as schema_inventory;
