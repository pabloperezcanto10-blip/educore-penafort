import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

export function loadScheduleModule(dependencies = {}) {
  const dateCode = ts.transpileModule(readFileSync("src/lib/date-time/madrid.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const dates = { exports: {} };
  vm.runInNewContext(dateCode, { exports: dates.exports, Date, Intl });
  const scheduleCode = ts.transpileModule(readFileSync("src/lib/tutors/schedule.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const schedule = { exports: {} };
  vm.runInNewContext(scheduleCode, {
    exports: schedule.exports,
    require: (name) => name === "@/lib/date-time/madrid" ? dates.exports : dependencies[name] ?? {},
    Date, Intl, Map, Set
  });
  return { ...dates.exports, ...schedule.exports };
}

const api = loadScheduleModule();
for (let day = 1; day <= 5; day++) {
  const date = "2026-09-" + (20 + day);
  const slots = Array.from({ length: 5 }, (_, i) => ({ id: String(i), weekday: i + 1 }));
  assert.equal(api.getMadridWeekday(date), day);
  assert.deepEqual(api.getScheduleSlotsForDate(slots, date).map((slot) => slot.id), [String(day - 1)]);
}
assert.equal(api.getMadridWeekday("2026-09-27"), null);
assert.equal(api.getScheduleSlotsForDate([], "invalid").length, 0);
for (const [instant, expected] of [
  ["2026-09-20T22:05:00Z", "2026-09-21"],
  ["2026-09-24T22:05:00Z", "2026-09-25"],
  ["2026-01-04T23:05:00Z", "2026-01-05"],
  ["2026-03-29T01:30:00Z", "2026-03-29"],
  ["2026-10-25T01:30:00Z", "2026-10-25"]
]) assert.equal(api.getMadridDate(instant), expected);
console.log("PASS: Monday-Friday, weekend, invalid date, Madrid midnight, winter and DST.");
