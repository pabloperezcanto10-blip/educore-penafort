import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const targetTables = new Set([
  "partial_grades",
  "evaluation_criteria",
  "quarter_final_grades",
  "term_subject_grades",
  "evaluation_publications",
  "annual_evaluation_weights",
  "final_course_grades",
  "final_evaluation_publications"
]);
const legacyConflictTargets = [
  "academic_year_id,student_id,subject_id,term,assessment_type,assessment_name",
  "academic_year_id,teacher_id,course_id,subject_id",
  "academic_year_id,student_id,subject_id,teacher_id,course_id,term",
  "academic_year_id,student_id,subject_id,term",
  "academic_year_id,course_id,term",
  "academic_year_id,student_id,subject_id",
  "academic_year_id,course_id"
];

const files = [];
const failures = [];
const inventory = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collect(absolutePath);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(absolutePath);
    }
  }
}

function methodName(call) {
  return ts.isPropertyAccessExpression(call.expression)
    ? call.expression.name.text
    : null;
}

function outerChain(node) {
  let current = node;
  while (current.parent) {
    if (
      ts.isPropertyAccessExpression(current.parent) &&
      current.parent.expression === current
    ) {
      current = current.parent;
      continue;
    }
    if (ts.isCallExpression(current.parent) && current.parent.expression === current) {
      current = current.parent;
      continue;
    }
    break;
  }
  return current;
}

function containingFunction(node) {
  let current = node.parent;
  while (current) {
    if (ts.isFunctionLike(current)) return current;
    current = current.parent;
  }
  return null;
}

collect(sourceRoot);

for (const file of files) {
  const sourceText = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  for (const legacyTarget of legacyConflictTargets) {
    const unsafePattern = new RegExp(
      `onConflict\\s*:\\s*["']${legacyTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
    );
    if (unsafePattern.test(sourceText)) {
      failures.push(
        `${path.relative(root, file)} still uses legacy ON CONFLICT ${legacyTarget}`
      );
    }
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      methodName(node) === "from" &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      targetTables.has(node.arguments[0].text)
    ) {
      const table = node.arguments[0].text;
      const chain = outerChain(node);
      const chainText = chain.getText(sourceFile);
      const relativeFile = path.relative(root, file);
      const line =
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const isRead = /\.select\s*\(/.test(chainText);
      const isUpdate = /\.(update|delete)\s*\(/.test(chainText);
      const isInsert = /\.(insert|upsert)\s*\(/.test(chainText);

      inventory.push({ table, file: relativeFile, line, isRead, isUpdate, isInsert });

      if ((isRead || isUpdate) && !/\.eq\s*\(\s*["']school_id["']/.test(chainText)) {
        failures.push(`${relativeFile}:${line} ${table} lacks an explicit school_id filter`);
      }
      if (
        (isRead || isUpdate) &&
        !/\.eq\s*\(\s*["']academic_year_id["']/.test(chainText)
      ) {
        failures.push(
          `${relativeFile}:${line} ${table} lacks an explicit academic_year_id filter`
        );
      }
      if (/\.upsert\s*\(/.test(chainText)) {
        const conflictMatch = chainText.match(
          /onConflict\s*:\s*["']([^"']+)["']/
        );
        if (
          !conflictMatch ||
          !conflictMatch[1].startsWith("school_id,academic_year_id,")
        ) {
          failures.push(
            `${relativeFile}:${line} ${table} does not use a tenant-aware ON CONFLICT target`
          );
        }
      }
      if (isInsert) {
        const owner = containingFunction(node);
        const ownerText = owner?.getText(sourceFile) ?? chainText;
        if (!ownerText.includes("school_id") || !ownerText.includes("academic_year_id")) {
          failures.push(
            `${relativeFile}:${line} ${table} write does not carry explicit academic context`
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const reads = inventory.filter((item) => item.isRead).length;
const writes = inventory.filter((item) => item.isInsert || item.isUpdate).length;
const byTable = [...targetTables].map((table) => ({
  table,
  references: inventory.filter((item) => item.table === table).length
}));

console.log("Academic application scope inventory");
console.log(`Files scanned: ${files.length}`);
console.log(`Target reads: ${reads}`);
console.log(`Target writes: ${writes}`);
for (const item of byTable) {
  console.log(`- ${item.table}: ${item.references}`);
}

if (failures.length > 0) {
  console.error("\nAcademic scope verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nAcademic application scope verification passed.");
