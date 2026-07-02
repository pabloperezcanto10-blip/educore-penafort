create table if not exists public.student_incidents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  description text not null,
  severity text not null,
  created_at timestamptz not null default now(),
  constraint student_incidents_type_not_empty check (length(trim(type)) > 0),
  constraint student_incidents_description_not_empty check (length(trim(description)) > 0),
  constraint student_incidents_severity_valid check (severity in ('leve', 'media', 'grave'))
);

create index if not exists student_incidents_student_id_created_at_idx
on public.student_incidents (student_id, created_at desc);

create index if not exists student_incidents_tutor_id_idx
on public.student_incidents (tutor_id);

alter table public.student_incidents enable row level security;

drop policy if exists "student_incidents_tutor_select_own_students" on public.student_incidents;
create policy "student_incidents_tutor_select_own_students"
on public.student_incidents
for select
to authenticated
using (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_incidents.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);

drop policy if exists "student_incidents_tutor_insert_own_students" on public.student_incidents;
create policy "student_incidents_tutor_insert_own_students"
on public.student_incidents
for insert
to authenticated
with check (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_incidents.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);
