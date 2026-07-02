alter table public.notifications
add column if not exists category text not null default 'general';

alter table public.notifications
add column if not exists read_at timestamptz;

alter table public.notifications
alter column read set default false;

alter table public.notifications
alter column created_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_category_valid'
      and conrelid = 'public.notifications'::regclass
  ) then
    alter table public.notifications
    add constraint notifications_category_valid
    check (category in ('incidencia', 'académico', 'tutoría', 'general'));
  end if;
end $$;

create index if not exists notifications_receiver_created_at_idx
on public.notifications (receiver_id, created_at desc);

create index if not exists notifications_sender_created_at_idx
on public.notifications (sender_id, created_at desc);

create index if not exists notifications_student_id_idx
on public.notifications (student_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_scoped" on public.notifications;
create policy "notifications_select_scoped"
on public.notifications
for select
to authenticated
using (
  sender_id = auth.uid()
  or receiver_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'director'
  )
);

drop policy if exists "notifications_tutor_insert_family_student" on public.notifications;
create policy "notifications_tutor_insert_family_student"
on public.notifications
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and read = false
  and read_at is null
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'tutor'
  )
  and exists (
    select 1
    from public.students s
    where s.id = notifications.student_id
      and s.tutor_teacher_id = auth.uid()
  )
  and exists (
    select 1
    from public.parent_students ps
    where ps.student_id = notifications.student_id
      and ps.parent_id = notifications.receiver_id
  )
);

drop policy if exists "notifications_family_mark_own_read" on public.notifications;
create policy "notifications_family_mark_own_read"
on public.notifications
for update
to authenticated
using (receiver_id = auth.uid())
with check (
  receiver_id = auth.uid()
  and read = true
  and read_at is not null
);
