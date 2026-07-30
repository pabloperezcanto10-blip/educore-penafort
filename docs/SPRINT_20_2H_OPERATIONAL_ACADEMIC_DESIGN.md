# Sprint 20.2H - Operational academic multitenancy design

Status: **GO WITH BLOCKERS**
Scope: design and read-only diagnostics only
Branch baseline: `staging`
Initial HEAD: `0735169fe0e94181ad3ad45d4f0277b53d2a1638`
Staging project: `zhnbrpcekmxldxlqrbhr`
Production project: `higdnodnztismxmusejz`

## 1. Executive decision

Migration wave 039 must contain only the eight operational academic tables
that participate directly in grades, criteria, evaluation results, annual
weights and publications:

1. `partial_grades`
2. `evaluation_criteria`
3. `quarter_final_grades`
4. `term_subject_grades`
5. `evaluation_publications`
6. `annual_evaluation_weights`
7. `final_course_grades`
8. `final_evaluation_publications`

All eight require a direct, non-null `school_id`. Their current ownership is
derivable without guessing, but the future implementation must compare every
available source (`student`, `course`, `subject`, `academic_year` and
`teacher_assignment`) before writing the value.

The old 039 draft is not safe to promote: it mixes academic, attendance,
communication and audit domains; it uses one-source updates; and it retains
global role policies. It is replaced by a non-executable design draft outside
`supabase/migrations`.

The recommendation is **GO WITH BLOCKERS**, not GO:

- split implementation into 039A (columns/backfill/constraints), 039B
  (tenant-aware triggers and RLS), and 039C (application queries/actions);
- replace the global academic-year default trigger on the eight tables;
- add direct `school_id` filters to service-role reads;
- make all write actions provide and verify the active academic year;
- keep the current name-based partial-grade/criterion association as a known
  functional debt, not as a database FK;
- run synthetic two-school authenticated regression before promotion.

No migration was created or applied in this sprint.

## 2. Audited public tables and wave classification

Twenty-nine public tables were identified from the schema and migrations.
Sixteen are still operational waves; thirteen are already foundation,
configuration or people roots.

| Group | Tables | Decision |
| --- | --- | --- |
| Foundation/configuration/people already covered | `schools`, `school_memberships`, `profiles`, `academic_years`, `courses`, `subjects`, `course_subjects`, `students`, `families`, `student_families`, `parent_students`, `teachers`, `teacher_assignments` | Existing 034-038 boundary |
| 039 academic operations | `partial_grades`, `evaluation_criteria`, `quarter_final_grades`, `term_subject_grades`, `evaluation_publications`, `annual_evaluation_weights`, `final_course_grades`, `final_evaluation_publications` | Direct `school_id` |
| 040 tracking and attendance | `attendance_records`, `student_attendance`, `student_incidents`, `student_observations`, `teacher_schedule` | Separate dependency/RLS wave |
| 041 communication and support | `notifications`, `internal_notifications`, `audit_logs` | Separate cross-cutting wave |

No extra communications table exists: the real conversation store is
`notifications`. No table was assigned to a wave from an assumed name.

## 3. Tenant ownership tree

```text
school
|-- academic_year
|   |-- course
|   |   |-- student
|   |   |-- teacher_assignment (teacher + subject)
|   |   |-- evaluation_publication
|   |   `-- final_evaluation_publication
|   |-- course_subject (course + subject)
|   |-- evaluation_criterion (teacher + course + subject)
|   |-- annual_evaluation_weight (teacher + course + subject)
|   |-- partial_grade (student + teacher + course + subject)
|   |-- quarter_final_grade (student + teacher + course + subject)
|   |-- term_subject_grade (student + teacher + course + subject)
|   `-- final_course_grade (student + teacher + course + subject)
`-- school_membership
    |-- director/superadmin publisher
    |-- tutor/teacher actor
    `-- family reader through parent_students
```

Ownership is not established by the user profile alone. A multischool teacher
can have several memberships and assignments. The row tenant must be derived
from its academic roots and those roots must agree.

## 4. Production and staging aggregate diagnostics

The production checks were read-only and emitted only counts and anomaly
totals. No UUID, name, email, grade, comment, observation or free text was
printed.

### Production row counts

| Table | Rows |
| --- | ---: |
| `profiles` | 55 |
| `academic_years` | 1 |
| `courses` | 12 |
| `subjects` | 18 |
| `course_subjects` | 102 |
| `students` | 51 |
| `teacher_assignments` | 10 |
| `partial_grades` | 17 |
| `evaluation_criteria` | 14 |
| `quarter_final_grades` | 0 |
| `term_subject_grades` | 2 |
| `evaluation_publications` | 0 |
| `annual_evaluation_weights` | 0 |
| `final_course_grades` | 0 |
| `final_evaluation_publications` | 0 |

The eight 039 tables contain 33 rows. All 33 have a deterministic tenant path
under the current Peñafort dataset.

### Production anomaly totals

- one active academic year;
- courses without academic year: 0;
- students without course or year: 0;
- student/course year mismatch: 0;
- orphan course-subject relations: 0;
- orphan teacher assignments: 0;
- assignment/course year mismatch: 0;
- orphan rows in every 039 table: 0;
- student/course mismatch in grade tables: 0;
- student/year mismatch in grade tables: 0;
- course/year mismatch in all 039 tables: 0;
- missing teacher assignment for teacher-owned rows: 0;
- incompatible duplicates for future tenant uniques: 0;
- invalid publication metadata: 0.

Production is still on the legacy monotenant schema and has no
`school_memberships` table. That is expected: 034-038 remain staging-only.

### Staging row counts

Staging contains two academic years, two courses, three subjects, three
course-subject links, nine memberships and no rows in the eight 039 tables.
All current preflight anomaly counts are zero.

### Ambiguity matrix

| Check | Prod. count | Impact | Resolution | Blocks 039 |
| --- | ---: | --- | --- | --- |
| Student/course/year mismatch | 0 | Could assign a grade to the wrong tenant | Repair roots before any backfill | Yes |
| Course/subject tenant mismatch | 0 | Cross-school academic content | Require same-tenant course-subject configuration | Yes |
| Academic-year tenant mismatch | 0 | Grade in the wrong school year | Composite year/school FK | Yes |
| Missing exact teacher assignment | 0 | Teacher ownership cannot be proven | Exact tenant/course/subject/year assignment | Yes |
| Unresolved ownership candidate | 0 | `school_id` would require guessing | Leave null and abort | Yes |
| More than one distinct tenant source | 0 | Silent cross-tenant assignment | Never use `COALESCE`; abort | Yes |
| Future tenant-unique conflict | 0 | Constraint cannot be created | Dedicated data repair before 039 | Yes |
| Published row with invalid metadata/publisher | 0 | Unattributable publication | Require active Director/Superadmin membership | Yes |
| Partial grade without structural criterion FK | Not countable | Rename can break calculation association | Separate future `criterion_id` design | No for tenant backfill; yes for full relational claim |

## 5. Matrix for wave 039

Common facts:

- every table uses `id uuid` as primary key;
- every table has RLS enabled;
- all eight received `academic_year_id NOT NULL` in migration 023;
- migration 023 also installed a global default-year trigger;
- current director/superadmin policies depend on legacy
  `current_user_has_role`, not an active school membership;
- current uniques contain `academic_year_id`, but not `school_id`.

| Table | Purpose and current uniqueness | Tenant sources | Direct `school_id` | Main ambiguity/stop condition |
| --- | --- | --- | --- | --- |
| `partial_grades` | Assessment grade. Unique year/student/subject/term/type/name. | student, course, subject, year, assignment | Yes | Any source mismatch or missing assignment |
| `evaluation_criteria` | Weighted criterion. Unique year/teacher/course/subject/term/name. | course, subject, year, assignment | Yes | Assignment or course-subject mismatch |
| `quarter_final_grades` | Legacy quarterly result. Unique year/student/subject/teacher/course/term. | student, course, subject, year, assignment | Yes | Any source mismatch |
| `term_subject_grades` | Official term close/result. Unique year/student/subject/term. | student, course, subject, year, assignment | Yes | Multiple teacher rows hidden by current unique or source mismatch |
| `evaluation_publications` | Publication state per course/term. Unique year/course/term. | course, year, publisher membership | Yes | Publisher not valid for tenant when published |
| `annual_evaluation_weights` | Term weights. Unique year/teacher/course/subject. | course, subject, year, assignment | Yes | Missing/mismatched assignment |
| `final_course_grades` | Annual subject result. Unique year/student/subject. | student, course, subject, year, assignment | Yes | Teacher mismatch hidden by current unique |
| `final_evaluation_publications` | Final publication per course. Unique year/course. | course, year, publisher membership | Yes | Publisher not valid for tenant when published |

### Detailed current-state matrix

| Table | Prod. rows | Current references/checks | Current indexes/triggers | Current RLS | Actions/routes and service role | Rollback and stop |
| --- | ---: | --- | --- | --- | --- | --- |
| `partial_grades` | 17 | student, auth teacher, subject, course, year; grade 0-10; type/term/name checks | student-term, teacher, subject, year lookup, assessment unique; global year trigger | Tutor assignment CRUD except delete; Family visible linked child; Director/Superadmin global SELECT | Gradebook saves; student/family/supervision/profile reads; optional admin labels and Director detail | Keep column/data; stop on root/assignment mismatch or future unique conflict |
| `evaluation_criteria` | 14 | auth teacher, course, subject, year; weight/type/name checks | lookup + year lookup; global year trigger | Tutor own SELECT/INSERT/UPDATE/DELETE with partial assignment checks; Director/Superadmin global SELECT | Criterion save/delete, calculations, supervision and settings routes | Restore prior policies only; stop on missing assignment/course-subject or duplicate name |
| `quarter_final_grades` | 0 | student, subject, auth teacher, course, year; grade ranges | lookup; global year trigger; year unique | Tutor own/assignment SELECT/INSERT/UPDATE; Director/Superadmin global SELECT | Tutor quarter save; supervision/read-only views | Additive rollback; stop on any inconsistent academic root |
| `term_subject_grades` | 2 | student, subject, auth teacher, course, year; grade/status/close checks | teacher/year lookups; updated-at and global year triggers | Tutor assignment SELECT/INSERT/UPDATE; Family closed + published; Director/Superadmin global SELECT | Term save/reopen, family grades, supervision, term PDF; admin client in labels/PDF | Preserve close/status/text; stop on publication mismatch or missing assignment |
| `evaluation_publications` | 0 | course, auth publisher, year; term and publication metadata check | course/year publication lookups; updated-at and global year triggers | Director/Superadmin global management; Tutor assigned read; Family published child course | Director/Admin publish action, family publication checks, term report | Preserve publication state; stop if publisher cannot be authorized in tenant |
| `annual_evaluation_weights` | 0 | auth teacher, course, subject, year; sum 100/non-negative | year lookup/unique; updated-at and global year triggers | Tutor assigned ALL; Director/Superadmin global SELECT | Tutor annual-weight save; annual reads and final PDF; optional admin client | Preserve weights; stop on assignment, year or course-subject mismatch |
| `final_course_grades` | 0 | student, subject, auth teacher, course, year; status and existing unique | year lookup/unique; updated-at and global year triggers | Tutor assigned ALL; Director/Superadmin global SELECT; Family published child | Tutor final save; supervision/family/final PDF; optional admin client | Preserve grades/status/observation; stop on root or assignment mismatch |
| `final_evaluation_publications` | 0 | course, auth publisher, year | year unique; updated-at and global year triggers | Director/Superadmin global ALL; Tutor/Director/Superadmin read; Family published child course | Director/Admin final publish, family state, final PDF | Preserve publication state; stop on invalid publisher or course/year mismatch |

Related routes are:

- Tutor: `/dashboard/tutor/gradebook`,
  `/dashboard/tutor/evaluation-settings`,
  `/dashboard/tutor/final-grades`, and student profile;
- Director: `/dashboard/director/gradebook`, `/dashboard/director/reports`,
  `/dashboard/director/final-grades`, and student supervision;
- Admin: `/dashboard/admin/gradebook`, `/dashboard/admin/reports`,
  `/dashboard/admin/final-grades`, and student supervision;
- Family: `/dashboard/family/grades` and `/dashboard/family/student`;
- documents: term preview and final PDF routes under
  `/dashboard/reports`.

### Current triggers and functions

`term_subject_grades`, both publication tables, annual weights and final
grades have updated-at triggers. These are tenant-neutral and can remain.

The global `set_default_academic_year_id()` trigger is unsafe for operational
multitenancy because its no-argument helper picks one globally active year.
Migration 036 made configuration inserts tenant-aware, but the eight
operational triggers from 023 still call the global form. 039A must replace
them with a validator that:

1. derives or receives `school_id` from validated academic roots;
2. requires `academic_year_id`;
3. verifies `academic_year.school_id = row.school_id`;
4. never selects the first active year globally;
5. rejects conflicting roots.

`current_user_has_role(text)` has a fixed `public` search path and reads the
legacy profile role. It must not authorize tenant rows. New policies must use
`has_school_role(school_id, roles)` and active memberships. Proposed new
security-definer helpers must use `SET search_path = public, pg_temp`, revoke
PUBLIC execution, and grant only the minimum authenticated execution.

## 6. Deterministic backfill design

Stable Peñafort tenant ID:
`20f20000-0000-4000-8000-000000000001`.

The constant is a final assertion, not the primary inference mechanism.

### Student-owned rows

For `partial_grades`, `quarter_final_grades`, `term_subject_grades` and
`final_course_grades`:

1. join student, course, subject and academic year;
2. require student, course, subject and year to have the same non-null tenant;
3. require student course/year to match row course/year;
4. require a teacher assignment for the same tenant, teacher, course, subject
   and year;
5. assign the agreed tenant only after the count of candidates is exactly one;
6. stop if any row remains unresolved or has more than one distinct source.

### Course-owned rows

For `evaluation_criteria` and `annual_evaluation_weights`:

1. compare course, subject and academic-year tenants;
2. verify the exact teacher assignment;
3. assign only the single agreed tenant.

For both publication tables:

1. compare course and academic-year tenants;
2. if `published = true`, require publication timestamp, publisher, and an
   active Director or Superadmin membership in that tenant;
3. an unpublished legacy row may have no publisher;
4. assign only the single agreed tenant.

### Backfill invariants

- columns are nullable only during the controlled transaction/window;
- no `COALESCE` between competing sources;
- no tenant is inferred from `profile_id` alone;
- no row is assigned by ordering, name, email or first membership;
- grade values, text, visibility, status and business timestamps are untouched;
- NOT NULL is added only after zero unresolved, zero contradictory and zero
  duplicate rows;
- pre/post row counts and checksums of business columns must match.

## 7. Anti-cross constraints and tenant uniqueness

Prerequisite unique roots already exist:

- `academic_years(id, school_id)`;
- `courses(id, school_id)`;
- `subjects(id, school_id)`;
- `students(id, school_id)`;
- `teacher_assignments(school_id, teacher_id, course_id, subject_id, academic_year_id)`.

Each 039 table needs:

- FK `school_id -> schools(id)`;
- unique `(id, school_id)` to support future composite references;
- composite FKs for every academic root present in the row;
- tenant-aware unique replacing the current unique;
- a validator for teacher assignment and publisher membership when a plain FK
  cannot express role/active-state semantics.

Proposed tenant uniques:

| Table | Tenant unique |
| --- | --- |
| `partial_grades` | `(school_id, academic_year_id, student_id, subject_id, term, assessment_type, assessment_name)` |
| `evaluation_criteria` | `(school_id, academic_year_id, teacher_id, course_id, subject_id, term, name)` |
| `quarter_final_grades` | `(school_id, academic_year_id, student_id, subject_id, teacher_id, course_id, term)` |
| `term_subject_grades` | `(school_id, academic_year_id, student_id, subject_id, term)` |
| `evaluation_publications` | `(school_id, academic_year_id, course_id, term)` |
| `annual_evaluation_weights` | `(school_id, academic_year_id, teacher_id, course_id, subject_id)` |
| `final_course_grades` | `(school_id, academic_year_id, student_id, subject_id)` |
| `final_evaluation_publications` | `(school_id, academic_year_id, course_id)` |

The existing model deliberately allows only one official term/final subject
result per student/subject/year. Changing that functional rule is outside
20.2H.

## 8. RLS matrix

All policies include an active school and active membership. An inactive
school, inactive membership, missing membership or incompatible role returns
zero rows.

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `partial_grades` | Tutor exact assignment; Director own school; Family linked child + visible; Superadmin global read | Tutor exact assignment/student/year | Tutor same existing row and same checks | None |
| `evaluation_criteria` | Tutor own assignment; Director own school; Superadmin global read | Tutor exact assignment/year | Tutor exact assignment/year | Tutor own exact assignment |
| `quarter_final_grades` | Tutor own assignment; Director own school; Superadmin global read | Tutor exact assignment/student/year | Tutor same existing row and checks | None |
| `term_subject_grades` | Tutor own assignment; Director own school; Family linked child + closed + published; Superadmin global read | Tutor exact assignment/student/year | Tutor same row; publication must still be false for reopen | None |
| `evaluation_publications` | Tutor assigned course; Director own school; Family linked child + published; Superadmin global read | Director own school or contextual Superadmin | Same as insert; publisher same tenant | None |
| `annual_evaluation_weights` | Tutor own assignment; Director own school; Superadmin global read | Tutor exact assignment/year | Tutor exact assignment/year | Preserve current Tutor behavior only if product requires it |
| `final_course_grades` | Tutor own assignment; Director own school; Family linked child + closed + final publication; Superadmin global read | Tutor exact assignment/student/year | Tutor same existing row and checks | Preserve current Tutor behavior only if product requires it |
| `final_evaluation_publications` | Tutor assigned course; Director own school; Family linked child + published; Superadmin global read | Director own school or contextual Superadmin | Same as insert; publisher same tenant | None |

Family details:

- `partial_grades`: `visible_to_family = true` plus same-school
  `parent_students`; current behavior does not require publication and is
  preserved unless product explicitly changes it;
- `term_subject_grades`: `status = closed`, matching same-school published
  `evaluation_publications`, same year/term/course, and family relation;
- `final_course_grades`: `status = closed`, matching same-school published
  `final_evaluation_publications`, same year/course, and family relation;
- criteria, quarter final rows and weights are never directly visible.

## 9. Visibility and publication sources of truth

- partial note visibility: `partial_grades.visible_to_family`;
- term close: `term_subject_grades.status = closed`;
- term publication: `evaluation_publications.published`;
- final close: `final_course_grades.status = closed`;
- final publication: `final_evaluation_publications.published`;
- criterion visibility is configuration metadata and does not itself publish
  a grade;
- `published_at` and `published_by` are mandatory when a publication is true.

Publication joins must include `school_id`, `academic_year_id`, course and
term where applicable. A course UUID alone remains globally unique today, but
direct tenant predicates are required for auditability and service-role
safety.

## 10. Application query inventory

| Module/file | Operations | Current tenant boundary | 039C adaptation |
| --- | --- | --- | --- |
| `src/lib/grades/grades.ts` | Tutor gradebook, student/family grades, supervision, labels | Active year plus scoped roots/RLS; some admin label reads | Add direct `school_id` to all 039 reads and scoped IDs; keep RLS |
| `src/lib/grades/annual.ts` | Weights, teacher final rows, supervision, family final rows/publications | Active school roots; optional admin client | Add direct `school_id`; require scoped assignment/year in teacher flow |
| `src/lib/reports/term-report-pdf.ts` | Term report | Validates student and family relation before admin reads | Add `school_id` to publication and term-grade queries |
| `src/lib/reports/final-report-pdf.ts` | Final report | Validates student and family relation before admin reads | Add `school_id` to publications, term/final grades and weights |
| `src/lib/director/students.ts` | Student profile grade panel | Validates student in active school before admin read | Add `school_id` to partial-grade query |
| Tutor/director/admin/family grade pages | Render shared helpers | No direct database writes | Inherit adapted helpers; no duplicate role implementation |

Other observed gaps to address in 039C:

- `getAssignedCoursesForTeacher` and `getSubjectCoursesForTeacher` use the
  scoped academic-year ID but should also filter assignments and labels by
  active `school_id` when the admin client is used;
- `getStudentsForCourse` should add direct `school_id`;
- supervision currently scopes 039 rows through lists of student/course IDs;
  after 039 it should filter `school_id` first;
- profile label reads are acceptable only for actor IDs already derived from
  same-tenant assignments. They do not establish tenant ownership.

## 11. Server Action inventory

| File/action | Future validation requirement |
| --- | --- |
| Tutor gradebook: `saveGradebook` | Context, active Tutor membership, exact assignment/year, same-tenant students, explicit `school_id` in upsert |
| `saveEvaluationCriterion`, `deleteEvaluationCriterion` | Context, assignment/year, criterion `school_id`; never update by ID/teacher alone |
| `saveQuarterFinalGrades`, `saveTermSubjectGrades` | Context, assignment/year, students, unpublished state and criteria total, explicit tenant upsert |
| `reopenTermSubjectGrade` | Load by ID + `school_id`, validate assignment/year and publication in same tenant |
| Tutor final grades: `saveAnnualWeights`, `saveFinalCourseGrade` | Exact assignment including academic year; explicit tenant in upsert |
| Director/admin: `publishEvaluation`, `publishFinalEvaluation` | Active Director/Superadmin membership, course/year/tenant, publisher membership, explicit tenant |

All future actions follow:

1. authenticate;
2. resolve `ActiveSchoolContext`;
3. validate active membership and contextual role;
4. resolve active academic year for the same school;
5. validate student/course/subject/assignment/publication roots;
6. ignore client-provided tenant values;
7. write explicit server-derived `school_id`;
8. audit;
9. revalidate cache.

## 12. Service-role inventory

| Location | Reason | Current gate | Required 039 rule |
| --- | --- | --- | --- |
| `createGradeLabelClient` in `grades.ts` | Consistent supervision/label reads | Calling helper resolves active school or scoped IDs | Every 039 query gets direct school predicate |
| `createAnnualClient` in `annual.ts` | Annual supervision/family labels | Role/context and school-scoped roots | Direct school predicate on weights/results/publications |
| Term/final report helpers | Generate document consistently | Validated profile, active school, student and family relation | Direct tenant predicates on every operational table |
| Director student detail client | Aggregate profile panels | Student validated by school/year | Direct school predicate on grade row |

No relevant service-role write to the eight 039 tables was found. The listed
reads are not presently unbounded at the entry point, but they remain fragile
because the operational table itself lacks `school_id`. They are classified
as **safe only with current seed validation; mandatory hardening in 039C**.

## 13. Partial grade to criterion limitation

There is no `criterion_id` in `partial_grades`. Calculations match
`assessment_name` to `evaluation_criteria.name` after normalization and then
compare assessment type. This is functional legacy behavior.

Consequences:

- 039 must not invent a criterion FK or rewrite historical grades;
- ambiguity checks can validate course/subject/year/teacher but cannot prove a
  structural criterion relation;
- criterion renames can disconnect a calculated grade from its intended
  criterion;
- a later product/data migration should add a stable criterion reference
  after a dedicated compatibility analysis.

This is a blocker for claiming full relational integrity, but not for a
deterministic tenant backfill of the existing 33 rows.

## 14. Index design

Do not add a standalone school index to every table automatically. Prefer
indexes matching real access paths:

- grades: `(school_id, academic_year_id, course_id, subject_id, term)` and
  `(school_id, student_id, created_at desc)`;
- criteria: `(school_id, academic_year_id, teacher_id, course_id, subject_id, term, active)`;
- term/final rows: `(school_id, academic_year_id, course_id, subject_id, status)`
  and `(school_id, student_id)`;
- publications: `(school_id, academic_year_id, course_id, term, published)`
  or the final equivalent;
- weights: tenant unique doubles as the principal lookup index.

Existing year-first indexes should be reviewed for redundancy after query
plans are measured in staging. Index replacement must not occur in the same
transaction as an unverified backfill on a larger production dataset.

## 15. Proposed implementation order

### 039A - ownership and integrity

1. lock preconditions and counts;
2. add nullable `school_id`;
3. add temporary backfill indexes only if query plans require them;
4. compute candidate tenant sources without writing;
5. stop on unresolved, contradictory or duplicate rows;
6. perform deterministic backfill;
7. compare counts and business-column checksums;
8. add composite FKs and tenant uniques as `NOT VALID` where appropriate;
9. validate constraints;
10. set NOT NULL.

### 039B - runtime database boundary

1. replace global academic-year default triggers on all eight tables;
2. add assignment/publisher validators with safe search path and grants;
3. replace legacy policies with tenant-aware RLS;
4. test Superadmin, Director, Tutor, Family, inactive membership, no
   membership and inactive school;
5. test deliberate cross-tenant relationships in `BEGIN`/`ROLLBACK`.

### 039C - application rollout

1. update reads and Server Actions to pass/filter server-derived tenant;
2. update generated database types;
3. deploy code compatible with the new columns/policies;
4. run authenticated two-school regression;
5. monitor errors and query plans.

This division is mandatory. A single large migration is not recommended.

## 16. Rollback

Rollback is additive-first:

- before NOT NULL: stop, retain nullable columns and diagnostic state;
- after NOT NULL but before RLS: revert application feature flag/path, relax
  only the new constraint if necessary, retain backfilled values;
- after RLS: restore reviewed prior policies temporarily, never drop
  `school_id`;
- after code rollout: deploy the previous application build while preserving
  compatible additive columns;
- staging: restore from a recoverable backup if constraint validation changes
  unexpected data;
- production: use the pre-approved restore point and operational window.

Do not drop backfilled columns as a first response. Do not delete or rewrite
grades, observations, visibility or publication state.

## 17. Preflight, postflight and stop criteria

Preflight must prove:

- identical baseline migration history;
- row counts and business-column checksums captured;
- zero orphan roots;
- zero cross-source tenant contradictions;
- zero unresolved rows;
- zero future unique conflicts;
- exact teacher assignment for teacher-owned rows;
- valid publication metadata and publisher membership;
- no unsafe public security-definer execution.

Postflight must prove:

- total row count unchanged for each table;
- `school_id IS NULL = 0`;
- every Peñafort row has the stable Peñafort tenant;
- zero composite-FK violations;
- zero cross-tenant joins;
- zero new duplicates;
- grade values, comments, recommendations, observations, visibility and
  publication state unchanged;
- functional timestamps unchanged except documented technical timestamps;
- complete authenticated RLS matrix;
- service-role requests cannot bypass resource ownership validation.

Stop immediately if any ownership source differs, a row has no unique source,
a future unique conflicts, a publisher cannot be authorized, a Family policy
can see draft/unpublished data, a Tutor can see an unassigned course, a
security-definer helper is exposed, rollback is unavailable, or manual edits
to real data would be required.

## 18. Future synthetic dataset

The future regression dataset is ephemeral and staging-only. It contains two
schools, two years, two courses, two subjects, two students, a direct tutor,
an assignment-only tutor, a director, a family, a multischool tutor, an
inactive membership and a no-membership user.

Operational rows cover criteria, visible and hidden partial grades, term and
final results, annual weights, one published and one unpublished evaluation,
and a deliberate cross-tenant relation. All creation and assertions use
stable generated IDs and all cleanup is manifest-driven. Negative database
tests run inside `BEGIN`/`ROLLBACK`.

No such dataset was created in Sprint 20.2H.

## 19. Artifacts and environment safety

Artifacts:

- `supabase/plans/20_2/039_operational_academic_multitenancy.sql`;
- `supabase/verification/020_2h_operational_academic_inventory.sql`;
- `supabase/verification/020_2h_operational_academic_preflight.sql`;
- `supabase/verification/020_2h_operational_academic_ambiguities.sql`;
- this document and concise updates to the three multitenant baseline docs.

Safety statement:

- 039-041 were not executed;
- no file was added to `supabase/migrations`;
- no migration 001-038 was changed;
- no remote SQL write or backfill occurred;
- production, main and real Colegio Peñafort remained unchanged;
- no personal data, fixtures, dumps, CSV files, credentials or secrets were
  added.

## 20. Final recommendations

1. Implement 039 only as the controlled 039A/039B/039C sequence.
2. Do not promote 037-038 to production until 039 has passed a staging
   rehearsal and the combined production window/rollback has been approved.
3. Do not create Colegio EducaCora yet.
4. Keep 040 and 041 separate; they have different visibility and rollback
   risks.
5. Schedule the stable `criterion_id` design after tenant ownership is
   complete; do not couple it to 039.

## 21. Sprint 20.2I implementation status

The executable 039A counterpart is
`supabase/migrations/039_academic_operations_school_scope.sql`. It implements
only direct ownership, deterministic backfill, composite integrity,
tenant-aware uniqueness, lookup indexes, `NOT NULL` and structural write
compatibility.

039A deliberately does not modify RLS, grants, publication authorization,
family visibility, application queries or Server Actions. Its structural
trigger derives only from audited academic roots; 039B must still replace the
legacy global academic-year behavior and introduce tenant-aware
authorization.

The legacy business unique objects remain temporarily for current
`ON CONFLICT` compatibility. The tenant-aware uniques are already canonical,
and 039C must migrate callers before the compatibility objects are retired.

Detailed execution and verification evidence belongs to
`docs/SPRINT_20_2I_039A_ACADEMIC_BACKFILL.md`.

## 22. Sprint 20.2J authorization status

The executable 039B counterpart is
`supabase/migrations/040_academic_operations_rls.sql`. It replaces the legacy
global academic policies with school-scoped authorization, validates
publication actors, preserves the current Family visibility contract and
removes anonymous grants from the eight academic tables.

039B is applied only to staging. Its transactional matrix verifies
Superadmin, Director, direct tutor, assigned teacher, multischool tutor,
Family, inactive membership, missing membership and cross-tenant negative
cases. Detailed evidence and the remaining 039C blockers are documented in
`docs/SPRINT_20_2J_039B_ACADEMIC_RLS.md`.
