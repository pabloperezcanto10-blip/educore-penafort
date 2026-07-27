# Sprint 20.2B migration drafts

`DO NOT APPLY` - `DESIGN ONLY`

These files describe the proposed 035-040 migration sequence. They are outside
`supabase/migrations` deliberately and must not be applied by the CLI.

Before promotion into real migrations:

1. run the aggregate production diagnostics;
2. resolve every blocking anomaly;
3. exercise the sequence against synthetic staging fixtures with rollback;
4. review RLS and application query changes;
5. take a recoverable staging backup;
6. move one approved file at a time into `supabase/migrations`.

Stable Peñafort tenant id: `20f20000-0000-4000-8000-000000000001`.

## Current sequence

- `035` and `036` have executable counterparts already applied only in
  staging.
- `037` was redesigned in Sprint 20.2D. It derives people ownership from
  academic roots, blocks ambiguous identities, adds composite FKs, validates
  memberships and scopes the existing people RLS policies.
- `038-040` remain earlier design drafts and must be reconciled with the new
  `037` before promotion. In particular, `039` must not recreate constraints
  or validators that `037` now owns.

The source of truth for the people wave is
`docs/MULTITENANT_PEOPLE_MIGRATION_037.md`.
