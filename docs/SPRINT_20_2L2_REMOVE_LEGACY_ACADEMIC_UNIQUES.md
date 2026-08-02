# Sprint 20.2L2 - Remove legacy academic uniqueness in staging

Status: **GO for staging; production promotion remains blocked**.

Migration `041_remove_legacy_academic_uniques.sql` was applied only to
Supabase staging `zhnbrpcekmxldxlqrbhr`. It removes one standalone UNIQUE
index and seven UNIQUE constraints audited in 20.2L1. Production, `main` and
real Colegio Penafort data were not accessed or changed.

## Recoverable backup

Docker was unavailable for `supabase db dump`, so the approved official
fallback was used: linked-project catalog queries plus a reproducible manual
rollback. The pre-change snapshot is versioned in
`supabase/plans/20_2/041_prechange_staging_snapshot.md` and includes:

- exact definitions for the 8 legacy objects;
- the 8 tenant-aware replacements and 8 compound-FK support indexes;
- applied migration inventory;
- row counts and structural fingerprints for policies, grants and triggers;
- zero personal data.

`supabase/plans/20_2/041_rollback_staging.sql` recreates the exact pre-041
objects and refuses to run when an object already exists or a legacy-key
duplicate is present. Its definitions were executed successfully inside
`BEGIN/ROLLBACK` by `020_2l2_041_rollback_rehearsal.sql`; a subsequent
postflight confirmed that staging remained in post-041 state.

## Objects removed

1. `partial_grades_unique_assessment_year_idx`;
2. `evaluation_criteria_unique_name_year`;
3. `quarter_final_grades_unique_student_term_year`;
4. `term_subject_grades_unique_student_subject_term_year`;
5. `evaluation_publications_unique_course_term_year`;
6. `annual_weights_unique_year`;
7. `final_course_grades_unique_year`;
8. `final_evaluation_publications_unique_course_year`.

Migration 041 verifies all replacements, context columns, compound
academic-year/school FKs and duplicate preconditions before taking an
access-exclusive lock and dropping only those objects. It does not contain
data, RLS, grant, trigger or column changes.

## A/B rehearsal and regression

The extended `020_2k_039c_application_checks.sql` ran before and after 041 in
a transaction that always rolls back. In both passes it created equivalent
synthetic rows for tenant A and B in all eight academic tables and confirmed:

- both tenants insert successfully;
- all canonical `ON CONFLICT` targets include school and academic year;
- an A upsert never changes B and a B upsert never changes A;
- a same-tenant upsert updates one row instead of creating a duplicate;
- cross-tenant compound relations are rejected for all eight tables;
- Director A/B, Tutor A/B, multischool Tutor, Family A/B, Superadmin,
  inactive membership and no-membership boundaries remain correct;
- Family sees only visible and published data;
- a Tutor cannot write through another tenant or without its assignment.

No HTTP or PostgREST error was observed in the database regression. No
application source changed in this sprint.

## Postflight and cleanup

`020_2l2_041_postflight.sql` is SELECT-only and reports:

- legacy objects: 0;
- valid tenant-aware objects: 8;
- valid `(id, school_id)` indexes: 8;
- incompatible duplicates and null tenant context: 0;
- academic rows, publications and visible-family rows unchanged at 0;
- RLS policies: 36;
- grants: 143;
- non-internal triggers: 21;
- `ready_after_041 = true`.

All QA fixtures use fixed `20_2K_QA` identifiers and exist only inside
transactions. `020_2l2_qa_residue_check.sql` was run twice after the tests;
both runs returned zero users, sessions, profiles, memberships, assignments,
students, family links and academic rows.

## Migration state and decision

Staging is aligned at migrations `001-041`; the final database push dry-run is
empty. The decision is **GO for the completed staging removal**.

Promotion to production is still **NO-GO without a separate approval**. It
requires a production backup/restore rehearsal, review of the complete
037-041 promotion sequence, a maintenance window and a fresh preflight. Do
not create Colegio EducaCora until the production promotion and post-promotion
multitenant regression are explicitly approved.
