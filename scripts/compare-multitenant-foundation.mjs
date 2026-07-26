import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const [beforeArg, afterArg] = process.argv.slice(2);

if (!beforeArg || !afterArg) {
  throw new Error(
    "Usage: node scripts/compare-multitenant-foundation.mjs <before.json> <after.json>",
  );
}

function getInventory(raw) {
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
  const row = Array.isArray(parsed) ? parsed[0] : (parsed.rows?.[0] ?? parsed);

  if (!row?.schema_inventory) {
    throw new Error("The file does not contain schema_inventory.");
  }

  return row.schema_inventory;
}

function stableRows(rows) {
  return rows
    .map((row) => JSON.stringify(row, Object.keys(row).sort()))
    .sort();
}

function assertSame(label, beforeRows, afterRows) {
  const before = stableRows(beforeRows);
  const after = stableRows(afterRows);

  if (JSON.stringify(before) !== JSON.stringify(after)) {
    throw new Error(`Unexpected structural change in ${label}.`);
  }
}

const before = getInventory(
  await readFile(resolve(process.cwd(), beforeArg), "utf8"),
);
const after = getInventory(
  await readFile(resolve(process.cwd(), afterArg), "utf8"),
);

const foundationTables = new Set(["schools", "school_memberships"]);
const expectedFunctionSignatures = new Set([
  "handle_new_user()",
  "protect_profile_sensitive_fields()",
]);
const expectedTriggerNames = new Set([
  "schools_set_updated_at",
  "school_memberships_set_updated_at",
  "profiles_protect_sensitive_fields",
]);
const expectedRoutineNames = new Set([
  "handle_new_user",
  "protect_profile_sensitive_fields",
]);

assertSame(
  "existing tables",
  before.tables,
  after.tables.filter((row) => !foundationTables.has(row.table_name)),
);
assertSame(
  "existing columns",
  before.columns,
  after.columns.filter((row) => !foundationTables.has(row.table_name)),
);
assertSame(
  "existing constraints",
  before.constraints,
  after.constraints.filter((row) => !foundationTables.has(row.table_name)),
);
assertSame(
  "existing indexes",
  before.indexes,
  after.indexes.filter((row) => !foundationTables.has(row.table_name)),
);
assertSame(
  "unchanged functions",
  before.functions.filter(
    (row) => !expectedFunctionSignatures.has(row.function_signature),
  ),
  after.functions.filter(
    (row) => !expectedFunctionSignatures.has(row.function_signature),
  ),
);
assertSame(
  "existing triggers",
  before.triggers,
  after.triggers.filter((row) => !expectedTriggerNames.has(row.trigger_name)),
);
assertSame(
  "existing policies",
  before.policies,
  after.policies.filter((row) => !foundationTables.has(row.table_name)),
);
assertSame(
  "custom types",
  before.types,
  after.types,
);
assertSame(
  "extensions",
  before.extensions,
  after.extensions,
);
assertSame(
  "Auth hooks",
  before.auth_hooks,
  after.auth_hooks,
);
assertSame(
  "existing table grants",
  before.grants,
  after.grants.filter((row) => !foundationTables.has(row.table_name)),
);
assertSame(
  "unchanged routine grants",
  before.routine_grants.filter(
    (row) => !expectedRoutineNames.has(row.routine_name),
  ),
  after.routine_grants.filter(
    (row) => !expectedRoutineNames.has(row.routine_name),
  ),
);

const expectedCounts = {
  tables: 29,
  columns: 258,
  constraints: 159,
  indexes: 97,
  functions: 9,
  triggers: 25,
  auth_hooks: 1,
  policies: 102,
  types: 1,
  extensions: 5,
  grants: 583,
  routine_grants: 27,
};

for (const [collection, expected] of Object.entries(expectedCounts)) {
  const actual = after[collection]?.length;

  if (actual !== expected) {
    throw new Error(
      `Unexpected ${collection} count: expected ${expected}, received ${actual}.`,
    );
  }
}

console.log("Only the expected migration 034 structural changes were detected.");
console.log(JSON.stringify(expectedCounts, null, 2));
