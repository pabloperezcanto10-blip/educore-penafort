insert into public.subjects (name)
select subject_name
from (
  values
    ('Matemáticas'),
    ('Ciencias')
) as seed(subject_name)
where not exists (
  select 1
  from public.subjects subjects
  where lower(subjects.name) = lower(seed.subject_name)
);

with active_year as (
  select id
  from public.academic_years
  where active = true
  order by name desc
  limit 1
),
required_course_subjects(course_name, subject_name) as (
  values
    ('1º Primaria', 'Matemáticas'),
    ('2º Primaria', 'Matemáticas'),
    ('3º Primaria', 'Matemáticas'),
    ('4º Primaria', 'Matemáticas'),
    ('4º Primaria', 'Ciencias'),
    ('5º Primaria', 'Matemáticas'),
    ('5º Primaria', 'Ciencias'),
    ('6º Primaria', 'Matemáticas'),
    ('6º Primaria', 'Ciencias')
)
insert into public.course_subjects (course_id, subject_id, academic_year_id, optional, track)
select courses.id, subjects.id, active_year.id, false, 'comun'
from required_course_subjects
cross join active_year
join public.courses courses
  on courses.name = required_course_subjects.course_name
 and courses.academic_year_id = active_year.id
join public.subjects subjects
  on lower(subjects.name) = lower(required_course_subjects.subject_name)
where exists (
  select 1
  from information_schema.tables
  where table_schema = 'public'
    and table_name = 'course_subjects'
)
on conflict do nothing;

with active_year as (
  select id
  from public.academic_years
  where active = true
  order by name desc
  limit 1
),
tutor as (
  select id
  from public.profiles
  where lower(email) = 'tutor.prueba@penafort.com'
     or lower(email) like 'tutor.prueba%'
  order by email
  limit 1
),
required_assignments(course_name, subject_name) as (
  values
    ('1º Primaria', 'Matemáticas'),
    ('2º Primaria', 'Matemáticas'),
    ('3º Primaria', 'Matemáticas'),
    ('4º Primaria', 'Matemáticas'),
    ('4º Primaria', 'Ciencias'),
    ('5º Primaria', 'Matemáticas'),
    ('5º Primaria', 'Ciencias'),
    ('6º Primaria', 'Matemáticas'),
    ('6º Primaria', 'Ciencias')
)
insert into public.teacher_assignments (teacher_id, course_id, subject_id, academic_year_id)
select tutor.id, courses.id, subjects.id, active_year.id
from required_assignments
cross join active_year
cross join tutor
join public.courses courses
  on courses.name = required_assignments.course_name
 and courses.academic_year_id = active_year.id
join public.subjects subjects
  on lower(subjects.name) = lower(required_assignments.subject_name)
where not exists (
  select 1
  from public.teacher_assignments assignments
  where assignments.teacher_id = tutor.id
    and assignments.course_id = courses.id
    and assignments.subject_id = subjects.id
    and assignments.academic_year_id = active_year.id
);
