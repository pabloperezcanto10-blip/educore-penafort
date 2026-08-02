# Sprint 20.2 migration sequence

This directory preserves the reviewed source plans for the 035-041 sequence.
Only approved files receive an executable counterpart in
`supabase/migrations`.

Before promotion into real migrations:

1. run the aggregate production diagnostics;
2. resolve every blocking anomaly;
3. exercise the sequence against synthetic staging fixtures with rollback;
4. review RLS and application query changes;
5. take a recoverable staging backup;
6. move one approved file at a time into `supabase/migrations`.

Stable Peñafort tenant id: `20f20000-0000-4000-8000-000000000001`.

## Current sequence

- `035`, `036`, the corrected `037` and the additive RLS correction `038`
  have executable counterparts applied
  only in staging.
- `037` derives people ownership from academic roots, blocks ambiguous
  identities, replaces eight legacy simple FKs with composite FKs, validates
  memberships and scopes the existing people RLS policies.
- `039-041` remain earlier design drafts and must be reconciled with the new
  `037` before promotion. In particular, `040` must not recreate constraints
  or validators that `037` now owns.

The source of truth for the people wave is
`docs/MULTITENANT_PEOPLE_MIGRATION_037.md`.

## Sprint 20.2H scope

`039_operational_academic_multitenancy.sql` supersedes the previous broad 039
draft. It is fully commented and cannot act as a migration.

- 039: eight grading, criteria, result, weight and publication tables.
- 040: attendance, student tracking and teacher schedule.
- 041: communications, internal notifications and audit.

The 039 implementation must be split into ownership/backfill, database
authorization, and application rollout phases. See
`docs/SPRINT_20_2H_OPERATIONAL_ACADEMIC_DESIGN.md`.

## Sprint 20.2I scope

`039_academic_operations_school_scope.sql` is the executable 039A migration.
It contains only structural tenant ownership, deterministic backfill,
composite FKs, tenant-aware indexes/uniqueness, `NOT NULL` and a minimal
structural compatibility trigger.

039B RLS/publication authorization and 039C application changes remain
blocked. The staging-only rollback is kept as a fully commented manual plan
in `039a_rollback_staging.sql`. Execution evidence and stop criteria are in
`docs/SPRINT_20_2I_039A_ACADEMIC_BACKFILL.md`.

## Sprint 20.2J scope

`040_academic_operations_rls.sql` is the executable 039B migration. It is
applied only to staging and contains the tenant-aware RLS, scoped helper
functions, publication actor checks and grants for the eight academic tables.

The corresponding preflight, postflight and transactional role matrix are
`supabase/verification/020_2j_039b_*`. A manual staging rollback is preserved
as `040_039b_rollback_staging.sql`.

039C application changes remain blocked. Attendance and communications are
still separate future waves; this migration does not implement them.

## Sprint 20.2K scope

039C adapts the application to the academic structure and RLS already present
in staging migrations 039-040. It adds a shared academic operation context,
explicit school/year reads and writes, tenant-aware conflict targets, guarded
service-role reads, safe errors and reproducible static/SQL verification.

No new migration is introduced. In particular, 041 is not created: legacy
business uniqueness stays in place until a production-like restore rehearsal
and a separate removal decision. Attendance and communications remain outside
this wave.

Execution evidence and promotion blockers are documented in
`docs/SPRINT_20_2K_039C_ACADEMIC_APPLICATION.md`.

## Sprint 20.2L1 scope

20.2L1 audits the eight academic legacy uniqueness objects without changing
the application, RLS, migrations or remote data. The catalog and repository
audit found eight canonical tenant-aware replacements, no runtime legacy
consumer and no dependent PostgreSQL function, view or job.

`041_remove_legacy_academic_uniques.sql` is a non-executable design draft. It
must remain under `supabase/plans/20_2` until a separate staging-only 20.2L2
backup, collision rehearsal and rollback test approve an executable migration.
The evidence and decision are in
`docs/SPRINT_20_2L1_LEGACY_ACADEMIC_UNIQUES.md`.
