# Sprint 20.2L1 - Legacy academic uniqueness audit

Status: **GO for a staging-only 20.2L2 removal rehearsal**.

This sprint is audit and design only. It does not add an executable migration,
drop a constraint, change RLS, change application code or write remote data.
The linked project during the audit was staging `zhnbrpcekmxldxlqrbhr`.

## Scope and evidence

The audit covers the eight 039 academic tables. Evidence came from:

- migrations 012, 013, 015, 016, 022, 023 and 039;
- the live staging catalogs `pg_index`, `pg_constraint`, `pg_depend`,
  `pg_proc`, `pg_views` and `pg_matviews` using SELECT only;
- all repository source, scripts, plans, baseline, tests and verification SQL;
- the 20.2K TypeScript AST verifier;
- aggregate `pg_stat_statements` counts without exposing query text.

Staging contains 24 non-primary unique objects in scope:

- 8 legacy business-uniqueness objects;
- 8 canonical tenant-aware business indexes;
- 8 `(id, school_id)` indexes used by composite foreign keys.

## Final matrix

| Table | Legacy object | Legacy columns | Tenant-aware replacement | Tenant columns | school | year | Removable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `partial_grades` | `partial_grades_unique_assessment_year_idx` (index) | year, student, subject, term, type, name | `partial_grades_school_assessment_uidx` | school + legacy | yes | yes | yes |
| `evaluation_criteria` | `evaluation_criteria_unique_name_year` | year, teacher, course, subject, term, name | `evaluation_criteria_school_name_uidx` | school + legacy | yes | yes | yes |
| `quarter_final_grades` | `quarter_final_grades_unique_student_term_year` | year, student, subject, teacher, course, term | `quarter_final_grades_school_term_uidx` | school + legacy | yes | yes | yes |
| `term_subject_grades` | `term_subject_grades_unique_student_subject_term_year` | year, student, subject, term | `term_subject_grades_school_term_uidx` | school + legacy | yes | yes | yes |
| `evaluation_publications` | `evaluation_publications_unique_course_term_year` | year, course, term | `evaluation_publications_school_term_uidx` | school + legacy | yes | yes | yes |
| `annual_evaluation_weights` | `annual_weights_unique_year` | year, teacher, course, subject | `annual_weights_school_uidx` | school + legacy | yes | yes | yes |
| `final_course_grades` | `final_course_grades_unique_year` | year, student, subject | `final_course_grades_school_uidx` | school + legacy | yes | yes | yes |
| `final_evaluation_publications` | `final_evaluation_publications_unique_course_year` | year, course | `final_publications_school_uidx` | school + legacy | yes | yes | yes |

All eight replacements are unique, valid, ready, non-partial and use plain
columns. `school_id` and `academic_year_id` are NOT NULL in every table. Every
`(academic_year_id, school_id)` FK is validated.

## Application consumers

Seven runtime upserts were found and all use the 039 tenant-aware column set:

| Function | Table | Conflict target |
| --- | --- | --- |
| `saveGradebook` | `partial_grades` | school, year, student, subject, term, type, name |
| `saveQuarterFinalGrades` | `quarter_final_grades` | school, year, student, subject, teacher, course, term |
| `saveTermSubjectGrades` | `term_subject_grades` | school, year, student, subject, term |
| `saveAnnualWeights` | `annual_evaluation_weights` | school, year, teacher, course, subject |
| `saveFinalCourseGrade` | `final_course_grades` | school, year, student, subject |
| `publishEvaluation` | `evaluation_publications` | school, year, course, term |
| `publishFinalEvaluation` | `final_evaluation_publications` | school, year, course |

`evaluation_criteria` has no runtime upsert. `saveEvaluationCriterion` uses
tenant-contextual insert/update and the canonical tenant index enforces its
business uniqueness. `createStudentGrade` uses an explicit tenant-contextual
insert. No runtime write uses a legacy constraint name or legacy column list.

## External and secondary consumers

- PostgreSQL functions/procedures naming a legacy object: 0.
- PostgreSQL functions with academic `ON CONFLICT`: 0.
- Views or materialized views naming a legacy object: 0.
- Cron catalog: not installed in staging.
- Edge Functions and repository jobs touching the eight tables: 0.
- Import/export/maintenance scripts with academic legacy conflicts: 0.
- Observed academic `ON CONFLICT` calls in `pg_stat_statements`: 33.
- Observed tenant-aware calls: 33.
- Observed non-tenant conflict calls: 0.

The versioned baseline still describes the legacy objects because it is a
snapshot of the current schema, not a runtime consumer. It must be regenerated
or updated only after the future migration is rehearsed and accepted.

No consumer outside the repository can be proven impossible for all time.
For that reason 20.2L2 must repeat the catalog and observed-query audit
immediately before applying the staging-only migration.

## PostgreSQL dependencies

The seven legacy UNIQUE constraints have only their expected internal backing
index dependency. The standalone `partial_grades` legacy index has no dependent
database object. No FK, function, view, trigger or publication depends on the
eight objects by name.

## Collision analysis

The original risk statement was intentionally conservative. The final audit
shows a stronger invariant:

1. every legacy key already includes `academic_year_id`;
2. an academic year belongs to exactly one school;
3. all eight rows enforce the validated composite FK
   `(academic_year_id, school_id) -> academic_years(id, school_id)`;
4. therefore one valid legacy key cannot belong to two schools.

A valid A/B test with semantically equal data but distinct tenant-owned IDs is
accepted today. Reusing the exact legacy key with another `school_id` is not a
valid cross-tenant operation and is rejected by the year/school FK. No legacy
object is therefore capable of rejecting an otherwise valid A/B row solely
because another tenant has equivalent semantic data.

The objects should still be removed because they are redundant, permit future
callers to select a non-canonical conflict target and add unnecessary indexes.

The designed 20.2L2 transactional rehearsal is:

```sql
begin;
-- 1. Run 020_2l1_legacy_unique_consumers.sql and require green preconditions.
-- 2. Insert equivalent synthetic academic records for A and B using distinct
--    tenant-owned roots; both must succeed.
-- 3. Attempt a mismatched (academic_year_id, school_id); the composite FK must
--    reject it before uniqueness can authorize an invalid tenant relation.
-- 4. Drop the eight legacy objects using the reviewed 041 draft.
-- 5. Repeat both tenant-aware upserts and negative cross-tenant checks.
-- 6. Recreate the legacy objects from the rollback section once, then drop
--    them again, proving rollback viability.
rollback;
```

No version of this transaction was executed in 20.2L1.

## Draft 041 and rollback

`supabase/plans/20_2/041_remove_legacy_academic_uniques.sql` is explicitly
marked `DO NOT APPLY / DESIGN ONLY / NOT A MIGRATION`. It contains exact drops,
replacement-index preconditions, postflight and a manual recreation script.

The standalone partial-grade object requires `DROP INDEX`; the other seven
require `ALTER TABLE ... DROP CONSTRAINT`. Rollback is viable while the
preflight confirms no duplicates under the legacy column sets.

## Decision and 20.2L2 gate

Decision: **GO** to create and rehearse an executable 041 in staging during a
separate Sprint 20.2L2. This is not approval for production.

20.2L2 must:

1. take a recoverable staging backup;
2. rerun repository, catalog, dependency and statement audits;
3. run the A/B transaction and manual rollback rehearsal;
4. create the executable migration from the reviewed draft;
5. apply only to staging;
6. rerun 039B RLS, 039C application and authenticated multischool regression;
7. update the schema baseline only after acceptance;
8. keep production, main and real Penafort data untouched.
