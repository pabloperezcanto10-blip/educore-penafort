# Sprint 20.2I - 039A academic operation scope

## Scope

Sprint 20.2I implements only the structural ownership phase of migration 039
in Supabase staging. It covers exactly:

1. `partial_grades`;
2. `evaluation_criteria`;
3. `quarter_final_grades`;
4. `term_subject_grades`;
5. `evaluation_publications`;
6. `annual_evaluation_weights`;
7. `final_course_grades`;
8. `final_evaluation_publications`.

Production, `main`, real Colegio Peñafort data, RLS, grants, dashboards,
Server Actions and publication behavior are outside this sprint.

## Environment and preflight

- Target: Supabase staging `zhnbrpcekmxldxlqrbhr`.
- Starting migration history: `001-038`.
- Starting branch: `staging`.
- Stable Peñafort tenant:
  `20f20000-0000-4000-8000-000000000001`.
- The eight target tables contain zero rows in staging.
- Aggregate production evidence remains the reviewed Sprint 20.2H snapshot:
  33 rows, with 17 partial grades, 14 criteria and 2 term results.
- Staging diagnostics returned zero unresolved rows, orphans, tenant
  contradictions, missing assignments, missing course-subject relations and
  future unique conflicts.

No production query or write is needed for the staging application of 039A.

## Migration

`supabase/migrations/039_academic_operations_school_scope.sql`:

- acquires a bounded lock on the eight target tables;
- validates the required 036-038 roots and the stable Peñafort tenant;
- captures row counts and hashes of every pre-existing functional column;
- adds nullable `school_id`;
- derives ownership from real academic roots;
- aborts on an unresolved or contradictory row;
- preserves functional `updated_at` values during the tenant-only backfill;
- adds direct school FKs and composite root FKs;
- replaces simple root FKs to avoid ambiguous PostgREST relationships;
- adds exact teacher-assignment constraints for teacher-owned rows;
- creates tenant-aware uniqueness and read indexes;
- installs a minimal structural context trigger for existing writes that omit
  `school_id`;
- applies `NOT NULL` only after the backfill gates pass;
- compares the functional hashes again before commit.

The trigger is a compatibility bridge, not 039B authorization. It only derives
the tenant from student/course/subject/year/assignment roots. It does not read
roles, active-school cookies, visibility or publication state. It does not
replace the future tenant-aware RLS work.

## Backfill rules

Student-owned rows require agreement between:

- student;
- student course and academic year;
- course;
- subject;
- academic year;
- exact teacher assignment;
- course-subject relation.

Criteria and annual weights require agreement between course, subject,
academic year, exact assignment and course-subject relation.

Publications derive only from course and academic year in 039A. Publisher
authorization remains explicitly deferred to 039B.

The Peñafort UUID is an assertion, never a global update default. No row is
assigned to the first membership or inferred from `profiles.role`.

## Constraints and indexes

039A adds:

- 8 direct `schools(id)` FKs;
- 32 composite anti-cross FKs;
- 8 unique `(id, school_id)` indexes;
- 8 tenant-aware business unique indexes;
- 10 tenant-aware lookup indexes;
- 8 structural context triggers backed by one trigger function.

The 26 simple root FKs are replaced with composite FKs in the same
transaction. Auth-user FKs remain unchanged.

The eight legacy business uniqueness objects remain temporarily as
compatibility aliases because current `ON CONFLICT` clauses still target
their legacy columns. Their identifiers are globally unique UUID roots, so
they do not merge tenant data. 039C must migrate every caller to a
`school_id` conflict target before those aliases are retired.

## Functional data guarantees

The migration may only add tenant ownership. It does not change:

- grades or calculated values;
- criteria or weights;
- comments, observations or recommendations;
- `visible_to_family`;
- publication state or publisher metadata;
- close/reopen state;
- functional timestamps.

Counts and JSONB hashes excluding the new `school_id` column are compared
inside the migration transaction. Any difference aborts 039A.

## Verification

- `020_2i_039a_postflight.sql` validates columns, constraints, indexes,
  triggers, RLS/grant counts, row ownership and publication/visibility counts.
- `020_2i_039a_integrity_tests.sql` creates only synthetic transactional
  fixtures, validates current writes without explicit `school_id`, rejects
  cross-school relationships and finishes with `ROLLBACK`.
- `039a_rollback_staging.sql` is a commented, manual, staging-only rollback
  that keeps `school_id` values and academic rows.

The rollback is not executed during normal validation because 039A is fully
transactional and the rollback weakens tenant constraints by design.

## RLS and grants

039A does not add, remove or alter an RLS policy or table grant. The expected
baseline remains 38 policies and 224 role-table grant rows across the eight
tables. 039B remains responsible for tenant-aware authorization, publisher
checks and family visibility.

## Promotion gates

039B may start only after:

- 039A is applied solely to staging;
- postflight and negative integrity tests pass;
- PostgREST has no ambiguous relationships;
- application lint, typecheck and build pass;
- DB lint has no migration-related warning;
- migration dry-run is empty;
- staging HTTP and safety controls pass.

Migration 037-038 must not be promoted to production yet. Colegio EducaCora
must not be created yet. Those decisions require the complete 039A-039C
staging sequence and an approved production rehearsal/rollback window.

## Execution evidence

039A was applied only to Supabase staging on 2026-07-30.

- Migration history is aligned from `001` through `039`.
- The post-application migration dry-run is empty.
- All eight target tables contained zero rows before and after 039A.
- The internal functional hashes matched before commit.
- Postflight found 8 `school_id NOT NULL` columns, 40 tenant-aware FKs,
  26 tenant-aware indexes and 8 enabled structural triggers.
- RLS remained at 38 policies and table grants remained at 224 rows.
- Transactional valid-write tests derived Peñafort ownership for all eight
  table shapes without an explicit `school_id`.
- Cross-course, cross-subject, cross-student, cross-year, wrong-school,
  nonexistent-school, school mutation and same-tenant duplicate tests were
  rejected.
- The transaction rolled back; synthetic students and assignments returned
  to zero and no academic fixture persisted.
- PostgREST embedding checks returned HTTP 200 for all eight tables and found
  no ambiguous relationship.
- Database lint returned no schema warning or error.
- Application lint, TypeScript and production build completed successfully.
- Staging public/login routes returned HTTP 200, protected gradebook
  redirected to login, `noindex` remained active and public registration
  remained disabled.

The public landing still describes Corium AI as product content. The
authenticated assistant remains controlled by `AI_ASSISTANT_ENABLED`; the
ignored staging QA environment keeps that flag disabled.

## 039B completion

Sprint 20.2J applied migration
`040_academic_operations_rls.sql` only to staging. The authorization layer now
contains 36 tenant-aware policies, scoped helper functions, publication actor
validation, Family publication/visibility checks and reduced grants.

The RLS matrix and protected-route regression passed and left no synthetic
rows or QA identities. 039C application scoping, tenant-aware conflict
targets and academic-year defaults remain required before production
promotion. See `docs/SPRINT_20_2J_039B_ACADEMIC_RLS.md`.
