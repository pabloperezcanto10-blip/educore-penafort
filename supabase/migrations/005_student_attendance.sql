create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late')),
  date date not null,
  notes text,
  justified boolean not null default false,
  justification_text text,
  justification_file_url text,
  created_at timestamptz not null default now(),
  constraint student_attendance_student_date_unique unique (student_id, date)
);

create index if not exists student_attendance_tutor_date_idx
on public.student_attendance (tutor_id, date desc);

create index if not exists student_attendance_student_date_idx
on public.student_attendance (student_id, date desc);

create index if not exists student_attendance_status_date_idx
on public.student_attendance (status, date desc);

alter table public.student_attendance enable row level security;

drop policy if exists "student_attendance_tutor_select_own_students" on public.student_attendance;
create policy "student_attendance_tutor_select_own_students"
on public.student_attendance
for select
to authenticated
using (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_attendance.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);

drop policy if exists "student_attendance_tutor_insert_own_students" on public.student_attendance;
create policy "student_attendance_tutor_insert_own_students"
on public.student_attendance
for insert
to authenticated
with check (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_attendance.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);

drop policy if exists "student_attendance_tutor_update_own_students" on public.student_attendance;
create policy "student_attendance_tutor_update_own_students"
on public.student_attendance
for update
to authenticated
using (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_attendance.student_id
      and s.tutor_teacher_id = auth.uid()
  )
)
with check (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_attendance.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);

drop policy if exists "student_attendance_family_select_children" on public.student_attendance;
create policy "student_attendance_family_select_children"
on public.student_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_students ps
    where ps.student_id = student_attendance.student_id
      and ps.parent_id = auth.uid()
  )
);

drop policy if exists "student_attendance_director_select_all" on public.student_attendance;
create policy "student_attendance_director_select_all"
on public.student_attendance
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'director'
  )
);
