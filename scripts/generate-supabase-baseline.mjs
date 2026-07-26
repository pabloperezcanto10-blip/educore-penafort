import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

const [inputArg, outputArg] = process.argv.slice(2);

if (!inputArg || !outputArg) {
  throw new Error(
    "Usage: node scripts/generate-supabase-baseline.mjs <inventory.json> <baseline.sql>",
  );
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const inputPath = resolve(repositoryRoot, inputArg);
const outputPath = resolve(repositoryRoot, outputArg);
const allowedOutputRoot = resolve(repositoryRoot, "supabase", "baseline");
const relativeOutput = relative(allowedOutputRoot, outputPath);

if (
  relativeOutput.startsWith("..") ||
  relativeOutput === "" ||
  relativeOutput.includes(":")
) {
  throw new Error("The baseline output must be inside supabase/baseline.");
}

const inventoryJson = (await readFile(inputPath, "utf8")).replace(/^\uFEFF/, "");
const parsed = JSON.parse(inventoryJson);
const firstRow = Array.isArray(parsed) ? parsed[0] : parsed;
const inventory = firstRow?.schema_inventory;

if (!inventory || typeof inventory !== "object") {
  throw new Error("The input does not contain a schema_inventory result.");
}

const requiredCollections = [
  "tables",
  "columns",
  "constraints",
  "indexes",
  "functions",
  "triggers",
  "auth_hooks",
  "policies",
  "types",
  "extensions",
  "grants",
  "routine_grants",
];

for (const key of requiredCollections) {
  if (!Array.isArray(inventory[key])) {
    throw new Error(`Missing structural inventory collection: ${key}`);
  }
}

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const quoteLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;
const qualify = (tableName) => `public.${quoteIdentifier(tableName)}`;

const phases = {
  "01-types-and-tables": [
  "create extension if not exists pgcrypto with schema extensions;",
  "",
  ],
  "02-constraints": [],
  "03-functions-defaults-and-indexes": [],
  "04-triggers-rls-and-policies": [],
  "05-grants": [],
  "06-auth-hooks": [],
};

let lines = phases["01-types-and-tables"];

for (const type of inventory.types) {
  if (type.type_kind !== "enum") {
    throw new Error(`Unsupported custom type in baseline: ${type.type_name}`);
  }

  const labels = type.enum_labels.map(quoteLiteral).join(", ");
  lines.push(
    "do $baseline$",
    "begin",
    `  create type public.${quoteIdentifier(type.type_name)} as enum (${labels});`,
    "exception",
    "  when duplicate_object then null;",
    "end",
    "$baseline$;",
    "",
  );
}

for (const table of inventory.tables) {
  const columns = inventory.columns.filter(
    (column) => column.table_name === table.table_name,
  );

  if (columns.length === 0) {
    throw new Error(`Table without columns in inventory: ${table.table_name}`);
  }

  const columnLines = columns.map((column) => {
    const fragments = [
      `  ${quoteIdentifier(column.column_name)}`,
      column.formatted_type,
    ];

    if (column.is_generated === "ALWAYS") {
      fragments.push(
        `generated always as (${column.generation_expression}) stored`,
      );
    } else if (column.is_identity === "YES") {
      fragments.push(
        `generated ${String(column.identity_generation).toLowerCase()} as identity`,
      );
    }

    if (column.collation_name) {
      fragments.push(`collate ${quoteIdentifier(column.collation_name)}`);
    }

    if (column.is_nullable === "NO") {
      fragments.push("not null");
    }

    return fragments.join(" ");
  });

  lines.push(
    `create table if not exists ${qualify(table.table_name)} (`,
    columnLines.join(",\n"),
    ");",
    "",
  );
}

lines = phases["02-constraints"];

const constraintPriority = {
  primary_key: 0,
  unique: 1,
  check: 2,
  exclusion: 3,
  foreign_key: 4,
};
const orderedConstraints = [...inventory.constraints].sort((left, right) => {
  const priorityDifference =
    (constraintPriority[left.constraint_type] ?? 99) -
    (constraintPriority[right.constraint_type] ?? 99);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return `${left.table_name}:${left.constraint_name}`.localeCompare(
    `${right.table_name}:${right.constraint_name}`,
  );
});

for (const constraint of orderedConstraints) {
  lines.push(
    "do $baseline$",
    "begin",
    "  if not exists (",
    "    select 1",
    "    from pg_constraint",
    `    where conname = ${quoteLiteral(constraint.constraint_name)}`,
    `      and conrelid = ${quoteLiteral(`public.${constraint.table_name}`)}::regclass`,
    "  ) then",
    `    alter table ${qualify(constraint.table_name)}`,
    `      add constraint ${quoteIdentifier(constraint.constraint_name)} ${constraint.definition};`,
    "  end if;",
    "end",
    "$baseline$;",
    "",
  );
}

lines = phases["03-functions-defaults-and-indexes"];

for (const func of inventory.functions) {
  const definition = func.definition.trim();
  lines.push(definition.endsWith(";") ? definition : `${definition};`, "");
}

for (const column of inventory.columns) {
  if (!column.column_default || column.is_generated === "ALWAYS") {
    continue;
  }

  lines.push(
    `alter table ${qualify(column.table_name)}`,
    `  alter column ${quoteIdentifier(column.column_name)} set default ${column.column_default};`,
    "",
  );
}

const constraintIndexes = new Set(
  inventory.constraints.map(
    (constraint) => `${constraint.table_name}:${constraint.constraint_name}`,
  ),
);

for (const index of inventory.indexes) {
  if (constraintIndexes.has(`${index.table_name}:${index.index_name}`)) {
    continue;
  }

  const definition = index.definition.replace(
    /^CREATE (UNIQUE )?INDEX /i,
    (_, unique = "") => `CREATE ${unique}INDEX IF NOT EXISTS `,
  );
  lines.push(`${definition};`, "");
}

lines = phases["04-triggers-rls-and-policies"];

for (const trigger of inventory.triggers) {
  lines.push(
    "do $baseline$",
    "begin",
    "  if not exists (",
    "    select 1",
    "    from pg_trigger",
    `    where tgname = ${quoteLiteral(trigger.trigger_name)}`,
    `      and tgrelid = ${quoteLiteral(`public.${trigger.table_name}`)}::regclass`,
    "      and not tgisinternal",
    "  ) then",
    `    ${trigger.definition};`,
    "  end if;",
    "end",
    "$baseline$;",
    "",
  );
}

for (const table of inventory.tables) {
  if (table.rls_enabled) {
    lines.push(`alter table ${qualify(table.table_name)} enable row level security;`);
  }
  if (table.rls_forced) {
    lines.push(`alter table ${qualify(table.table_name)} force row level security;`);
  }
}
lines.push("");

for (const policy of inventory.policies) {
  const roles = policy.roles.map(quoteIdentifier).join(", ");
  const clauses = [
    `create policy ${quoteIdentifier(policy.policy_name)}`,
    `on ${qualify(policy.table_name)}`,
    `as ${String(policy.permissive).toLowerCase()}`,
    `for ${String(policy.cmd).toLowerCase()}`,
    `to ${roles}`,
  ];

  if (policy.qual) {
    clauses.push(`using (${policy.qual})`);
  }
  if (policy.with_check) {
    clauses.push(`with check (${policy.with_check})`);
  }

  lines.push(`${clauses.join("\n")};`, "");
}

lines = phases["05-grants"];

const tableGrantGroups = new Map();
for (const grant of inventory.grants) {
  const key = `${grant.table_name}:${grant.grantee}`;
  const privileges = tableGrantGroups.get(key) ?? [];
  privileges.push(grant.privilege_type);
  tableGrantGroups.set(key, privileges);
}

for (const [key, privileges] of [...tableGrantGroups.entries()].sort()) {
  const [tableName, grantee] = key.split(":");
  lines.push(
    `grant ${[...new Set(privileges)].sort().join(", ")} on table ${qualify(tableName)} to ${quoteIdentifier(grantee)};`,
  );
}
lines.push("");

const routineGrantCounts = new Map();
for (const grant of inventory.routine_grants) {
  const key = `${grant.grantee}:${grant.privilege_type}`;
  routineGrantCounts.set(key, (routineGrantCounts.get(key) ?? 0) + 1);
}

for (const [key, count] of [...routineGrantCounts.entries()].sort()) {
  const [grantee, privilege] = key.split(":");
  if (privilege !== "EXECUTE" || count !== inventory.functions.length) {
    throw new Error(
      `Routine grants are not uniform for ${grantee}; explicit generation is required.`,
    );
  }
  lines.push(
    `grant execute on all functions in schema public to ${quoteIdentifier(grantee)};`,
  );
}

lines = phases["06-auth-hooks"];

for (const trigger of inventory.auth_hooks) {
  lines.push(
    "do $baseline$",
    "begin",
    "  if not exists (",
    "    select 1",
    "    from pg_trigger",
    `    where tgname = ${quoteLiteral(trigger.trigger_name)}`,
    "      and tgrelid = 'auth.users'::regclass",
    "      and not tgisinternal",
    "  ) then",
    `    ${trigger.definition};`,
    "  end if;",
    "end",
    "$baseline$;",
    "",
  );
}

const baseline = [
  "-- EducaCora public schema bootstrap baseline.",
  "-- Generated from the production structural catalog; contains no table rows.",
  "-- Apply only to a new, empty Supabase project after verifying the target.",
  "-- This file is intentionally outside supabase/migrations.",
  "-- Each named phase is transactional and can be executed independently.",
  "",
  ...Object.entries(phases).flatMap(([phaseName, phaseLines]) => [
    `-- baseline:phase:${phaseName}:start`,
    "begin;",
    "",
    ...phaseLines,
    "commit;",
    `-- baseline:phase:${phaseName}:end`,
    "",
  ]),
].join("\n");
const forbiddenStatements = [
  /^\s*drop\s/im,
  /^\s*truncate\s/im,
  /^\s*copy\s+public\./im,
];

for (const pattern of forbiddenStatements) {
  if (pattern.test(baseline)) {
    throw new Error(`Generated baseline contains forbidden SQL: ${pattern}`);
  }
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, baseline, "utf8");

console.log(
  JSON.stringify({
    output: relative(repositoryRoot, outputPath).replaceAll("\\", "/"),
    tables: inventory.tables.length,
    columns: inventory.columns.length,
    constraints: inventory.constraints.length,
    indexes: inventory.indexes.length,
    functions: inventory.functions.length,
    triggers: inventory.triggers.length,
    policies: inventory.policies.length,
    authHooks: inventory.auth_hooks.length,
  }),
);
