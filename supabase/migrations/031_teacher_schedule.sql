create table if not exists public.teacher_schedule (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 1 and 5),
  start_time time not null,
  end_time time not null,
  course_name text not null,
  subject_name text,
  is_break boolean not null default false,
  created_at timestamptz not null default now(),
  constraint teacher_schedule_time_order check (end_time > start_time),
  constraint teacher_schedule_unique_slot unique (teacher_id, weekday, start_time)
);

create index if not exists teacher_schedule_teacher_weekday_idx
on public.teacher_schedule (teacher_id, weekday, start_time);

alter table public.teacher_schedule enable row level security;

drop policy if exists "teacher_schedule_teacher_select_own" on public.teacher_schedule;

create policy "teacher_schedule_teacher_select_own"
on public.teacher_schedule
for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "teacher_schedule_director_select_all" on public.teacher_schedule;

create policy "teacher_schedule_director_select_all"
on public.teacher_schedule
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "teacher_schedule_superadmin_all" on public.teacher_schedule;

create policy "teacher_schedule_superadmin_all"
on public.teacher_schedule
for all
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

with tutor as (
  select id
  from public.profiles
  where email = 'tutor.prueba@penafort.com'
  limit 1
),
slots(weekday, start_time, end_time, course_name, subject_name, is_break) as (
  values
    (1, '09:00'::time, '09:50'::time, '2º Primaria', 'Math', false),
    (1, '09:50'::time, '10:40'::time, '5º Primaria', 'Science', false),
    (1, '10:40'::time, '11:10'::time, 'Patio', 'Patio', true),
    (1, '11:10'::time, '12:00'::time, '4º Primaria', 'Math', false),
    (1, '12:00'::time, '12:50'::time, '5º Primaria', 'Math', false),
    (1, '12:50'::time, '13:40'::time, '3º Primaria', 'Math', false),
    (1, '14:50'::time, '15:40'::time, '6º Primaria', 'Math', false),
    (1, '15:40'::time, '16:30'::time, '4º Primaria', 'Science', false),

    (2, '09:00'::time, '09:50'::time, '6º Primaria', 'Math', false),
    (2, '09:50'::time, '10:40'::time, '6º Primaria', 'Science', false),
    (2, '10:40'::time, '11:10'::time, 'Patio', 'Patio', true),
    (2, '11:10'::time, '12:00'::time, '4º Primaria', 'Science', false),
    (2, '12:00'::time, '12:50'::time, '5º Primaria', 'Math', false),
    (2, '12:50'::time, '13:40'::time, '1º Primaria', 'Math', false),
    (2, '14:50'::time, '15:40'::time, '5º Primaria', 'Science', false),
    (2, '15:40'::time, '16:30'::time, '4º Primaria', 'Math', false),

    (3, '09:00'::time, '09:50'::time, '3º Primaria', 'Math', false),
    (3, '09:50'::time, '10:40'::time, '1º Primaria', 'Math', false),
    (3, '11:10'::time, '12:00'::time, '4º Primaria', 'Math', false),
    (3, '12:00'::time, '12:50'::time, '4º Primaria', 'Science', false),
    (3, '12:50'::time, '13:40'::time, '6º Primaria', 'Science', false),
    (3, '14:50'::time, '15:40'::time, '2º Primaria', 'Math', false),
    (3, '15:40'::time, '16:30'::time, '6º Primaria', 'Math', false),

    (4, '09:00'::time, '09:50'::time, '6º Primaria', 'Math', false),
    (4, '09:50'::time, '10:40'::time, '3º Primaria', 'Math', false),
    (4, '11:10'::time, '12:00'::time, '2º Primaria', 'Math', false),
    (4, '12:00'::time, '12:50'::time, '1º Primaria', 'Math', false),
    (4, '12:50'::time, '13:40'::time, '5º Primaria', 'Science', false),
    (4, '14:50'::time, '15:40'::time, '5º Primaria', 'Math', false),
    (4, '15:40'::time, '16:30'::time, '6º Primaria', 'Science', false),

    (5, '09:00'::time, '09:50'::time, '5º Primaria', 'Math', false),
    (5, '09:50'::time, '10:40'::time, '6º Primaria', 'Science', false),
    (5, '10:40'::time, '11:10'::time, 'Patio', 'Patio', true),
    (5, '11:10'::time, '12:00'::time, '4º Primaria', 'Math', false),
    (5, '12:00'::time, '12:50'::time, '5º Primaria', 'Science', false),
    (5, '12:50'::time, '13:40'::time, '1º Primaria', 'Math', false),
    (5, '14:50'::time, '15:40'::time, '3º Primaria', 'Math', false),
    (5, '15:40'::time, '16:30'::time, '2º Primaria', 'Math', false)
)
insert into public.teacher_schedule (teacher_id, weekday, start_time, end_time, course_name, subject_name, is_break)
select tutor.id, slots.weekday, slots.start_time, slots.end_time, slots.course_name, slots.subject_name, slots.is_break
from tutor
cross join slots
on conflict (teacher_id, weekday, start_time)
do update set
  end_time = excluded.end_time,
  course_name = excluded.course_name,
  subject_name = excluded.subject_name,
  is_break = excluded.is_break;
