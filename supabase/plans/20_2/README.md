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
