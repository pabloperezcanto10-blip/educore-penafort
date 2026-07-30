# Sprint 20.2J - 039B academic RLS

## Scope

Sprint 20.2J applies the authorization phase of the academic operation wave
only to Supabase staging `zhnbrpcekmxldxlqrbhr`.

The executable migration is
`supabase/migrations/040_academic_operations_rls.sql`. It covers exactly:

1. `partial_grades`;
2. `evaluation_criteria`;
3. `quarter_final_grades`;
4. `term_subject_grades`;
5. `evaluation_publications`;
6. `annual_evaluation_weights`;
7. `final_course_grades`;
8. `final_evaluation_publications`.

Production, `main`, real Colegio Penafort data, attendance, communications,
application queries and Server Actions are outside this sprint.

## Authorization model

The migration replaces 38 legacy policies with 36 tenant-aware policies.
Every decision verifies an active school and uses active memberships for the
target `school_id`.

- Superadmin retains global supervision through the existing global platform
  role, but inactive schools remain excluded.
- Director receives read-only academic supervision inside the membership
  school and can manage that school's evaluation publications.
- A directly assigned tutor can read the academic context of tutored students.
- A teacher can write grades or criteria only with an exact active
  `teacher_assignment` for the same school, course and subject.
- Family can read only related students. Partial grades additionally require
  `visible_to_family`; term and final grades require closed results and the
  exact published evaluation.
- Inactive memberships, missing memberships, incompatible roles and inactive
  schools receive no academic rows.

The database intentionally authorizes all active memberships of a multischool
user. The selected `ActiveSchoolContext` must still be sent as an explicit
`school_id` filter by the application in 039C.

## Security-definer helpers

Sixteen narrowly scoped helper functions implement the policy predicates.
They use a fixed `search_path`, receive explicit academic roots, and do not
infer a tenant from the first membership.

Execution is revoked from `PUBLIC` and `anon`. Only `authenticated` and
`service_role` retain execution on the new helpers. Execute access was also
removed from `PUBLIC` and `anon` for the previously audited
security-definer functions.

## Grants

`anon` has no privilege on any of the eight academic tables.

`authenticated` receives only the table operations needed for RLS to decide:

- grading/configuration tables: `SELECT`, `INSERT`, `UPDATE`, `DELETE`;
- evaluation publications: `SELECT`, `INSERT`, `UPDATE`;
- final publications: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

No `TRUNCATE`, `REFERENCES` or `TRIGGER` privilege is granted to
`authenticated`. PostgreSQL owner and `service_role` behavior is unchanged.

## Publication and family visibility

Publication writes validate that the actor is an active Director or
Superadmin for the row's school. Published rows also require a valid
`published_by` actor and publication timestamp.

The current product contract is preserved:

- partial grades use relationship plus `visible_to_family`;
- term grades use closed status plus the matching published term;
- final grades use closed status plus the matching final publication;
- quarter final rows remain internal and are not exposed directly to Family;
- criteria and annual weights remain internal.

No publication, grade, observation or visibility value was changed by this
sprint.

## Verification

The following staging-only artifacts were executed:

- `020_2j_039b_preflight.sql`;
- `020_2j_039b_postflight.sql`;
- `020_2j_039b_rls_checks.sql`.

The RLS matrix ran inside `BEGIN`/`ROLLBACK` and covered:

- two active schools and one inactive school;
- Superadmin;
- Director for each active school;
- directly assigned tutor;
- teacher with an exact assignment;
- multischool tutor with explicit center filters;
- Family for each active school;
- inactive membership;
- user without membership;
- incompatible or unrelated Family role;
- visible and hidden partial grades;
- published and unpublished term/final results;
- cross-tenant negative writes and contradictory roots.

The matrix completed with `039B RLS matrix passed`; every synthetic academic
row rolled back. Three temporary route-regression users were then deleted.
Final verification found zero matching Auth users, profiles and memberships.
No real or personal data was used.

PostgREST returned HTTP 200 for nested reads on all eight target tables and
did not report ambiguous relationships. An anonymous academic read was
rejected. Authenticated smoke tests loaded the Director gradebook, Tutor
gradebook and Family grades routes without application or server errors.

## Staging state

- Migration history is aligned from `001` through `040`.
- `supabase db push --linked --dry-run` is empty after application.
- Database lint reports no schema warning or error.
- The eight target tables remain empty in staging outside rolled-back tests.
- Production, `main` and the real Colegio Penafort instance were not read or
  modified.

## Rollback

`supabase/plans/20_2/040_039b_rollback_staging.sql` is a reviewed manual
staging rollback. It restores the audited 039A policy/grant baseline and is
not an automatic migration.

It was not executed because 040 completed transactionally and every
postflight/RLS test passed. Executing it would intentionally restore the
legacy global authorization and therefore requires an explicit incident
decision.

## Remaining blockers

039C remains mandatory before any production promotion:

1. send explicit `school_id` and tenant academic-year context in every query
   and Server Action;
2. update service-role reads so they never rely on bypassing RLS for scope;
3. replace legacy `ON CONFLICT` targets with the tenant-aware unique objects;
4. replace the remaining global academic-year default behavior;
5. repeat authenticated write/publication regression with representative,
   disposable staging data;
6. rehearse backup, restore and the combined `037-040` production window.

Decision: **GO WITH BLOCKERS** for 039C. Migration 040 is accepted for
staging, but `037-040` must not be promoted to production yet.
