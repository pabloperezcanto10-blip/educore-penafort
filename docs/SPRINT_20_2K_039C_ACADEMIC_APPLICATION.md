# Sprint 20.2K - 039C academic application

## Scope

Sprint 20.2K completes the application side of the tenant-aware academic
wave. It applies only to the eight tables prepared by migrations 039 and 040:

- `partial_grades`;
- `evaluation_criteria`;
- `quarter_final_grades`;
- `term_subject_grades`;
- `evaluation_publications`;
- `annual_evaluation_weights`;
- `final_course_grades`;
- `final_evaluation_publications`.

The work was developed and validated on branch `staging` against Supabase
staging project `zhnbrpcekmxldxlqrbhr`. Production, `main`, the production
Auth project and the real Colegio Peñafort dataset were not queried or
modified by the QA flow.

## Academic operation context

`src/lib/grades/context.ts` is the single entry point for academic operations.
`requireAcademicOperationContext()` resolves, server-side:

1. the authenticated profile;
2. `ActiveSchoolContext`;
3. an active membership and its authorized role;
4. the selected active school;
5. exactly one active academic year belonging to that school.

The helper never accepts a form `school_id` as authority and never selects the
first global active year. Missing selection, inactive membership, inactive
school, missing year and multiple active years fail closed with safe messages.

## Read inventory

The reproducible AST verifier scans all TypeScript and TSX files under `src`.
At sprint close it found 35 target-table reads:

| Table | Reads |
| --- | ---: |
| `partial_grades` | 9 |
| `evaluation_criteria` | 8 |
| `quarter_final_grades` | 3 |
| `term_subject_grades` | 10 |
| `evaluation_publications` | 4 |
| `annual_evaluation_weights` | 3 |
| `final_course_grades` | 6 |
| `final_evaluation_publications` | 4 |

Some expressions contain more than one target read. Every direct target-table
read now includes both `school_id` and `academic_year_id`. Academic root
queries also constrain courses, students, assignments and subjects to the
resolved school/year as supported by each table.

The main adapted loaders are:

- `src/lib/grades/grades.ts`;
- `src/lib/grades/annual.ts`;
- `src/lib/director/students.ts`;
- `src/lib/tutors/alerts.ts`;
- `src/lib/reports/term-report-pdf.ts`;
- `src/lib/reports/final-report-pdf.ts`.

## Server Actions and writes

The verifier found 12 writes across the eight target tables. Actions now
resolve `ActiveSchoolContext` and the contextual academic year before
validating any client-supplied resource ID.

Adapted action families:

- tutor gradebook save, term close/reopen and evaluation criteria;
- tutor annual weights and final course grades;
- student-profile grade creation;
- director/admin term publication;
- director/admin final publication.

Every inserted/upserted row carries explicit `school_id` and
`academic_year_id`. Course, subject, student and assignment roots are checked
against the same context before mutation.

## Tenant-aware ON CONFLICT targets

The application has seven academic upsert call sites. They use these 039A
uniqueness targets:

- partial grade:
  `school_id,academic_year_id,student_id,subject_id,term,assessment_type,assessment_name`;
- evaluation criterion:
  `school_id,academic_year_id,teacher_id,course_id,subject_id,term,name`;
- quarter final:
  `school_id,academic_year_id,student_id,subject_id,teacher_id,course_id,term`;
- term subject result:
  `school_id,academic_year_id,student_id,subject_id,term`;
- term publication:
  `school_id,academic_year_id,course_id,term`;
- annual weights:
  `school_id,academic_year_id,teacher_id,course_id,subject_id`;
- final course result:
  `school_id,academic_year_id,student_id,subject_id`;
- final publication:
  `school_id,academic_year_id,course_id`.

Evaluation criteria use explicit insert/update rather than upsert. Their
tenant-aware unique
`school_id,academic_year_id,teacher_id,course_id,subject_id,term,name`
is nevertheless exercised by the transactional SQL verification.

The transactional verification proves initial insert, same-tenant update and
independent equivalent resources in two tenants. Cross-tenant writes and
contradictory roots are rejected.

## Service role

`createAdminClient()` remains only where report aggregation or global
supervision needs it. Every academic use is preceded by authentication,
authorized role resolution, active school selection and active academic-year
resolution. The resulting query carries direct school/year filters. Service
role is not used to bypass a failed membership or resource check.

## Publications and Family

Term and final publication actions validate school, year, course and actor
role before mutation. Publication conflict targets include both tenant and
academic year.

Authenticated Family regression proves:

- only linked students are visible;
- hidden partial grades remain hidden;
- visible partial grades are readable;
- term and final results are visible only when their publication is active;
- an unrelated family sees zero rows;
- no tenant B data appears in tenant A and vice versa.

## Cache and revalidation

No academic `unstable_cache`, global cache key or shared fetch cache was found
for the eight target tables. Reads execute with contextual school/year
filters. Existing `revalidatePath()` calls invalidate route output but do not
persist or share an unscoped academic payload between tenants. Browser
regression A -> B -> A for tutor and superadmin showed no stale cross-tenant
content.

## Error handling

Database and context failures return controlled product messages. Target
operations no longer expose raw SQL, policy text, service-role information,
stack traces or internal UUIDs to the UI.

## QA evidence

Two complementary suites were used:

1. `supabase/verification/020_2k_039c_application_checks.sql` runs entirely
   inside `BEGIN/ROLLBACK` and validates the eight conflict targets, RLS roles,
   publication visibility and negative cross-tenant cases.
2. Temporary ignored fixtures used random Auth credentials and exact row IDs
   in the two existing staging QA schools. They exercised real sessions and
   routes for superadmin, directors A/B, tutors A/B, a multischool tutor,
   families A/B, unrelated family, inactive membership and no membership.

The route regression additionally proved:

- Tutor saved a grade through the real Server Action;
- Director loaded and republished its own course;
- a manipulated Director `course_id` from tenant B produced no leaked data;
- Family A saw published state while Family B did not see unpublished term or
  final results;
- inactive and no-membership users reached `/no-school`;
- tutor and superadmin completed A -> B -> A without cache/data mixing.

The local app was started with process variables from the ignored staging
environment. `.env.local` was not edited or used as the staging authority.

## Cleanup

The app process was stopped before cleanup. Notifications and audit records
created by UI actions were removed with the exact QA user/student IDs, followed
by all academic rows, relations, assignments, roots, memberships, profiles and
Auth users. Cleanup was executed twice and a separate read-only audit was
executed twice across Auth and nine public-table scopes. Both audits returned
zero `20_2K_QA` rows.

No fixture manifest, credential file, password or staging environment file is
versioned.

## Legacy uniqueness and migration 041

All application upserts continue to use the tenant-aware 039A targets. Sprint
20.2L1 found no legacy consumer, and Sprint 20.2L2 applied executable
migration 041 only to staging after backup, A/B rehearsal and rollback tests.
The eight legacy objects are now absent from staging; the eight tenant-aware
replacements remain valid.

Decision for 039C remains **GO WITH BLOCKERS** for production. The staging
compatibility cleanup is complete, but promotion of the combined 037-041
sequence still requires a separately approved backup/restore rehearsal and
maintenance window.

## Reproducible checks

- `npm run verify:academic-scope`;
- `supabase/verification/020_2k_039c_application_checks.sql`;
- `supabase/verification/020_2k_cleanup.sql`;
- `npm run lint`;
- `npx tsc --noEmit`;
- `npm run build`;
- `npx supabase db lint --linked --level warning`;
- `npx supabase migration list --linked`;
- `npx supabase db push --linked --dry-run`;
- `git diff --check`.

## Promotion decision

039C can be considered validated in staging when all final checks remain
green. The combined 037-040 sequence must not yet be promoted to production
until a backup/restore rehearsal, an approved maintenance window and the
legacy-unique retirement decision are complete. Colegio EducaCora must not be
created before those gates.
