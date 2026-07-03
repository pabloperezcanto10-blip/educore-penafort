create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  schedule_id uuid references public.teacher_schedule(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'justified')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_student_schedule_date_unique unique (student_id, schedule_id, attendance_date)
);

create index if not exists attendance_records_teacher_date_idx
on public.attendance_records (teacher_id, attendance_date desc);

create index if not exists attendance_records_course_date_idx
on public.attendance_records (course_id, attendance_date desc);

create index if not exists attendance_records_student_date_idx
on public.attendance_records (student_id, attendance_date desc);

create or replace function public.set_attendance_records_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;

create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row
execute function public.set_attendance_records_updated_at();

alter table public.attendance_records enable row level security;

drop policy if exists "attendance_records_teacher_select_own_sessions" on public.attendance_records;
create policy "attendance_records_teacher_select_own_sessions"
on public.attendance_records
for select
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_schedule ts
    where ts.id = attendance_records.schedule_id
      and ts.teacher_id = auth.uid()
  )
);

drop policy if exists "attendance_records_teacher_insert_own_sessions" on public.attendance_records;
create policy "attendance_records_teacher_insert_own_sessions"
on public.attendance_records
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_schedule ts
    where ts.id = attendance_records.schedule_id
      and ts.teacher_id = auth.uid()
  )
  and exists (
    select 1
    from public.students s
    where s.id = attendance_records.student_id
      and s.course_id = attendance_records.course_id
      and s.active = true
  )
);

drop policy if exists "attendance_records_teacher_update_own_sessions" on public.attendance_records;
create policy "attendance_records_teacher_update_own_sessions"
on public.attendance_records
for update
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_schedule ts
    where ts.id = attendance_records.schedule_id
      and ts.teacher_id = auth.uid()
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_schedule ts
    where ts.id = attendance_records.schedule_id
      and ts.teacher_id = auth.uid()
  )
  and exists (
    select 1
    from public.students s
    where s.id = attendance_records.student_id
      and s.course_id = attendance_records.course_id
      and s.active = true
  )
);

drop policy if exists "attendance_records_family_select_children" on public.attendance_records;
create policy "attendance_records_family_select_children"
on public.attendance_records
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_students ps
    where ps.student_id = attendance_records.student_id
      and ps.parent_id = auth.uid()
  )
);

drop policy if exists "attendance_records_director_select_all" on public.attendance_records;
create policy "attendance_records_director_select_all"
on public.attendance_records
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "attendance_records_superadmin_select_all" on public.attendance_records;
create policy "attendance_records_superadmin_select_all"
on public.attendance_records
for select
to authenticated
using (public.current_user_has_role('superadmin'));
