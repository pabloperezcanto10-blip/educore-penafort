create table if not exists public.student_observations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  content text not null,
  priority text not null check (priority in ('baja', 'media', 'alta')),
  created_at timestamptz not null default now()
);

create index if not exists student_observations_student_created_at_idx
on public.student_observations (student_id, created_at desc);

create index if not exists student_observations_tutor_created_at_idx
on public.student_observations (tutor_id, created_at desc);

alter table public.student_observations enable row level security;

drop policy if exists "student_observations_tutor_select_own_students" on public.student_observations;
create policy "student_observations_tutor_select_own_students"
on public.student_observations
for select
to authenticated
using (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_observations.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);

drop policy if exists "student_observations_tutor_insert_own_students" on public.student_observations;
create policy "student_observations_tutor_insert_own_students"
on public.student_observations
for insert
to authenticated
with check (
  tutor_id = auth.uid()
  and exists (
    select 1
    from public.students s
    where s.id = student_observations.student_id
      and s.tutor_teacher_id = auth.uid()
  )
);

drop policy if exists "student_observations_director_select_all" on public.student_observations;
create policy "student_observations_director_select_all"
on public.student_observations
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "student_observations_superadmin_select_all" on public.student_observations;
create policy "student_observations_superadmin_select_all"
on public.student_observations
for select
to authenticated
using (public.current_user_has_role('superadmin'));
