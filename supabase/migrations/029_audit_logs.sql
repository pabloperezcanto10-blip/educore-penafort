create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  module text not null,
  entity_type text not null,
  entity_id uuid null,
  before_data jsonb null,
  after_data jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_user_id_idx
on public.audit_logs (actor_user_id, created_at desc);

create index if not exists audit_logs_action_module_idx
on public.audit_logs (action, module, created_at desc);

create index if not exists audit_logs_entity_idx
on public.audit_logs (entity_type, entity_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_superadmin_select_all" on public.audit_logs;

create policy "audit_logs_superadmin_select_all"
on public.audit_logs
for select
to authenticated
using (public.current_user_has_role('superadmin'));

drop policy if exists "audit_logs_director_select_non_technical" on public.audit_logs;

create policy "audit_logs_director_select_non_technical"
on public.audit_logs
for select
to authenticated
using (
  public.current_user_has_role('director')
  and action in (
    'grade_updated',
    'term_grade_closed',
    'term_grade_reopened',
    'evaluation_published',
    'communication_sent'
  )
);
