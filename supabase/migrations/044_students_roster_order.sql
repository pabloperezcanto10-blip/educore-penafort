-- A roster position belongs to an active student within one school, year and course.
-- Existing students remain unpositioned until the official class list is reconciled.
alter table public.students
  add column sort_order integer,
  add constraint students_sort_order_positive check (sort_order is null or sort_order > 0);

create unique index students_active_roster_order_unique
  on public.students (school_id, academic_year_id, course_id, sort_order)
  where active and sort_order is not null;

create index students_roster_lookup
  on public.students (school_id, academic_year_id, course_id, active, sort_order);
