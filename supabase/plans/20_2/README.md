# Sprint 20.2B migration drafts

`DO NOT APPLY` - `DESIGN ONLY` - `SPRINT 20.2A`

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
