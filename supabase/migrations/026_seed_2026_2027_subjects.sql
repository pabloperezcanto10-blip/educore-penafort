create table if not exists public.course_subjects (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete cascade,
  optional boolean not null default false,
  track text,
  created_at timestamptz not null default now()
);

create unique index if not exists course_subjects_unique_idx
on public.course_subjects (academic_year_id, course_id, subject_id, coalesce(track, ''));

create index if not exists course_subjects_year_course_idx
on public.course_subjects (academic_year_id, course_id);

create index if not exists course_subjects_subject_idx
on public.course_subjects (subject_id);

alter table public.course_subjects enable row level security;

drop policy if exists "course_subjects_authenticated_select" on public.course_subjects;
create policy "course_subjects_authenticated_select"
on public.course_subjects
for select
to authenticated
using (true);

drop policy if exists "course_subjects_superadmin_insert" on public.course_subjects;
create policy "course_subjects_superadmin_insert"
on public.course_subjects
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "course_subjects_superadmin_update" on public.course_subjects;
create policy "course_subjects_superadmin_update"
on public.course_subjects
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

drop policy if exists "course_subjects_superadmin_delete" on public.course_subjects;
create policy "course_subjects_superadmin_delete"
on public.course_subjects
for delete
to authenticated
using (public.current_user_has_role('superadmin'));

insert into public.academic_years (name, start_date, end_date, active)
select '2026-2027', '2026-09-01', '2027-06-30', true
where not exists (
  select 1 from public.academic_years where name = '2026-2027'
);

update public.academic_years
set active = case when name = '2026-2027' then true else false end;

with subject_seed(name) as (
  values
    ('Matemáticas'),
    ('Ciencias'),
    ('Valenciano'),
    ('Lengua Castellana'),
    ('Cambridge'),
    ('Inglés'),
    ('Música'),
    ('Educación Física'),
    ('Geografía e Historia'),
    ('Física y Química'),
    ('Biología'),
    ('Latín'),
    ('Economía'),
    ('Filosofía'),
    ('Matemáticas Ciencias'),
    ('Matemáticas Sociales'),
    ('Historia de España'),
    ('Historia del Arte')
)
insert into public.subjects (name)
select subject_seed.name
from subject_seed
where not exists (
  select 1
  from public.subjects s
  where lower(s.name) = lower(subject_seed.name)
);

with active_year as (
  select id from public.academic_years where name = '2026-2027' limit 1
),
curriculum(course_name, subject_name, optional, track) as (
  values
    ('1º Primaria', 'Matemáticas', false, 'comun'),
    ('1º Primaria', 'Ciencias', false, 'comun'),
    ('1º Primaria', 'Valenciano', false, 'comun'),
    ('1º Primaria', 'Lengua Castellana', false, 'comun'),
    ('1º Primaria', 'Cambridge', false, 'comun'),
    ('1º Primaria', 'Inglés', false, 'comun'),
    ('1º Primaria', 'Música', false, 'comun'),
    ('1º Primaria', 'Educación Física', false, 'comun'),
    ('2º Primaria', 'Matemáticas', false, 'comun'),
    ('2º Primaria', 'Ciencias', false, 'comun'),
    ('2º Primaria', 'Valenciano', false, 'comun'),
    ('2º Primaria', 'Lengua Castellana', false, 'comun'),
    ('2º Primaria', 'Cambridge', false, 'comun'),
    ('2º Primaria', 'Inglés', false, 'comun'),
    ('2º Primaria', 'Música', false, 'comun'),
    ('2º Primaria', 'Educación Física', false, 'comun'),
    ('3º Primaria', 'Matemáticas', false, 'comun'),
    ('3º Primaria', 'Ciencias', false, 'comun'),
    ('3º Primaria', 'Valenciano', false, 'comun'),
    ('3º Primaria', 'Lengua Castellana', false, 'comun'),
    ('3º Primaria', 'Cambridge', false, 'comun'),
    ('3º Primaria', 'Inglés', false, 'comun'),
    ('3º Primaria', 'Música', false, 'comun'),
    ('3º Primaria', 'Educación Física', false, 'comun'),
    ('4º Primaria', 'Matemáticas', false, 'comun'),
    ('4º Primaria', 'Ciencias', false, 'comun'),
    ('4º Primaria', 'Valenciano', false, 'comun'),
    ('4º Primaria', 'Lengua Castellana', false, 'comun'),
    ('4º Primaria', 'Cambridge', false, 'comun'),
    ('4º Primaria', 'Inglés', false, 'comun'),
    ('4º Primaria', 'Música', false, 'comun'),
    ('4º Primaria', 'Educación Física', false, 'comun'),
    ('5º Primaria', 'Matemáticas', false, 'comun'),
    ('5º Primaria', 'Ciencias', false, 'comun'),
    ('5º Primaria', 'Valenciano', false, 'comun'),
    ('5º Primaria', 'Lengua Castellana', false, 'comun'),
    ('5º Primaria', 'Cambridge', false, 'comun'),
    ('5º Primaria', 'Inglés', false, 'comun'),
    ('5º Primaria', 'Música', false, 'comun'),
    ('5º Primaria', 'Educación Física', false, 'comun'),
    ('6º Primaria', 'Matemáticas', false, 'comun'),
    ('6º Primaria', 'Ciencias', false, 'comun'),
    ('6º Primaria', 'Valenciano', false, 'comun'),
    ('6º Primaria', 'Lengua Castellana', false, 'comun'),
    ('6º Primaria', 'Cambridge', false, 'comun'),
    ('6º Primaria', 'Inglés', false, 'comun'),
    ('6º Primaria', 'Música', false, 'comun'),
    ('6º Primaria', 'Educación Física', false, 'comun'),
    ('1º ESO', 'Matemáticas', false, 'comun'),
    ('1º ESO', 'Lengua Castellana', false, 'comun'),
    ('1º ESO', 'Valenciano', false, 'comun'),
    ('1º ESO', 'Geografía e Historia', false, 'comun'),
    ('1º ESO', 'Física y Química', false, 'comun'),
    ('1º ESO', 'Biología', false, 'comun'),
    ('1º ESO', 'Inglés', false, 'comun'),
    ('1º ESO', 'Cambridge', false, 'comun'),
    ('1º ESO', 'Música', false, 'comun'),
    ('2º ESO', 'Matemáticas', false, 'comun'),
    ('2º ESO', 'Lengua Castellana', false, 'comun'),
    ('2º ESO', 'Valenciano', false, 'comun'),
    ('2º ESO', 'Geografía e Historia', false, 'comun'),
    ('2º ESO', 'Física y Química', false, 'comun'),
    ('2º ESO', 'Biología', false, 'comun'),
    ('2º ESO', 'Inglés', false, 'comun'),
    ('2º ESO', 'Cambridge', false, 'comun'),
    ('2º ESO', 'Música', false, 'comun'),
    ('3º ESO', 'Matemáticas', false, 'comun'),
    ('3º ESO', 'Lengua Castellana', false, 'comun'),
    ('3º ESO', 'Valenciano', false, 'comun'),
    ('3º ESO', 'Geografía e Historia', false, 'comun'),
    ('3º ESO', 'Física y Química', false, 'comun'),
    ('3º ESO', 'Biología', false, 'comun'),
    ('3º ESO', 'Inglés', false, 'comun'),
    ('3º ESO', 'Cambridge', false, 'comun'),
    ('4º ESO', 'Lengua Castellana', false, 'comun'),
    ('4º ESO', 'Valenciano', false, 'comun'),
    ('4º ESO', 'Geografía e Historia', false, 'comun'),
    ('4º ESO', 'Inglés', false, 'comun'),
    ('4º ESO', 'Cambridge', false, 'comun'),
    ('4º ESO', 'Latín', true, 'optativa'),
    ('4º ESO', 'Economía', true, 'optativa'),
    ('4º ESO', 'Matemáticas', true, 'optativa'),
    ('4º ESO', 'Física y Química', true, 'optativa'),
    ('4º ESO', 'Biología', true, 'optativa'),
    ('1º Bachillerato', 'Filosofía', false, 'comun'),
    ('1º Bachillerato', 'Inglés', false, 'comun'),
    ('1º Bachillerato', 'Valenciano', false, 'comun'),
    ('1º Bachillerato', 'Lengua Castellana', false, 'comun'),
    ('1º Bachillerato', 'Matemáticas Ciencias', true, 'ciencias'),
    ('1º Bachillerato', 'Biología', true, 'ciencias'),
    ('1º Bachillerato', 'Física y Química', true, 'ciencias'),
    ('1º Bachillerato', 'Matemáticas Sociales', true, 'sociales_humanidades'),
    ('1º Bachillerato', 'Latín', true, 'sociales_humanidades'),
    ('2º Bachillerato', 'Historia de España', false, 'comun'),
    ('2º Bachillerato', 'Inglés', false, 'comun'),
    ('2º Bachillerato', 'Valenciano', false, 'comun'),
    ('2º Bachillerato', 'Lengua Castellana', false, 'comun'),
    ('2º Bachillerato', 'Biología', true, 'ciencias'),
    ('2º Bachillerato', 'Física y Química', true, 'ciencias'),
    ('2º Bachillerato', 'Latín', true, 'sociales_humanidades'),
    ('2º Bachillerato', 'Historia del Arte', true, 'sociales_humanidades')
)
insert into public.course_subjects (course_id, subject_id, academic_year_id, optional, track)
select courses.id, subjects.id, active_year.id, curriculum.optional, curriculum.track
from curriculum
cross join active_year
join public.courses courses
  on courses.name = curriculum.course_name
 and courses.academic_year_id = active_year.id
join public.subjects subjects
  on lower(subjects.name) = lower(curriculum.subject_name)
on conflict do nothing;
