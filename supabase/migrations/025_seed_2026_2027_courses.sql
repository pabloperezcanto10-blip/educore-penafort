insert into public.academic_years (name, start_date, end_date, active)
values ('2026-2027', '2026-09-01', '2027-08-31', true)
on conflict (name) do update
set
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  active = true;

update public.academic_years
set active = false
where name <> '2026-2027';

with active_year as (
  select id
  from public.academic_years
  where name = '2026-2027'
  limit 1
),
official_courses(name) as (
  values
    ('1º Primaria'),
    ('2º Primaria'),
    ('3º Primaria'),
    ('4º Primaria'),
    ('5º Primaria'),
    ('6º Primaria'),
    ('1º ESO'),
    ('2º ESO'),
    ('3º ESO'),
    ('4º ESO'),
    ('1º Bachillerato'),
    ('2º Bachillerato')
)
update public.courses c
set academic_year_id = active_year.id
from official_courses, active_year
where c.name = official_courses.name
  and (c.academic_year_id is null or c.academic_year_id = active_year.id);

with active_year as (
  select id
  from public.academic_years
  where name = '2026-2027'
  limit 1
),
official_courses(name) as (
  values
    ('1º Primaria'),
    ('2º Primaria'),
    ('3º Primaria'),
    ('4º Primaria'),
    ('5º Primaria'),
    ('6º Primaria'),
    ('1º ESO'),
    ('2º ESO'),
    ('3º ESO'),
    ('4º ESO'),
    ('1º Bachillerato'),
    ('2º Bachillerato')
)
insert into public.courses (name, academic_year_id)
select official_courses.name, active_year.id
from official_courses
cross join active_year
where not exists (
  select 1
  from public.courses c
  where c.name = official_courses.name
    and c.academic_year_id = active_year.id
);
