create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  type text not null check (
    type in (
      'new_communication',
      'unread_communication',
      'new_visible_grade',
      'new_incident',
      'pending_attendance_justification',
      'report_published',
      'evaluation_pending_close',
      'report_pending_publication',
      'administrative_incident',
      'inactive_user'
    )
  ),
  title text not null,
  body text,
  related_entity_type text,
  related_entity_id uuid,
  related_href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists internal_notifications_user_read_created_idx
on public.internal_notifications (user_id, read, created_at desc);

create index if not exists internal_notifications_role_created_idx
on public.internal_notifications (role, created_at desc);

alter table public.internal_notifications enable row level security;

drop policy if exists "internal_notifications_select_own" on public.internal_notifications;
create policy "internal_notifications_select_own"
on public.internal_notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
);

drop policy if exists "internal_notifications_update_own_read" on public.internal_notifications;
create policy "internal_notifications_update_own_read"
on public.internal_notifications
for update
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
)
with check (
  user_id = auth.uid()
  or public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
);

drop policy if exists "internal_notifications_insert_staff" on public.internal_notifications;
create policy "internal_notifications_insert_staff"
on public.internal_notifications
for insert
to authenticated
with check (
  public.current_user_has_role('tutor')
  or public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
);

drop policy if exists "internal_notifications_superadmin_delete" on public.internal_notifications;
create policy "internal_notifications_superadmin_delete"
on public.internal_notifications
for delete
to authenticated
using (public.current_user_has_role('superadmin'));
