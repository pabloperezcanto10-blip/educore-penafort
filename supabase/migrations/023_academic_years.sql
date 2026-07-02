create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_date date,
  end_date date,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint academic_years_name_not_empty check (length(trim(name)) > 0),
  constraint academic_years_date_order check (start_date is null or end_date is null or start_date <= end_date)
);

create unique index if not exists academic_years_only_one_active_idx
on public.academic_years (active)
where active = true;

insert into public.academic_years (name, start_date, end_date, active)
values ('2026-2027', '2026-09-01', '2027-08-31', false)
on conflict (name) do update
set
  start_date = excluded.start_date,
  end_date = excluded.end_date;

update public.academic_years
set active = false
where name <> '2026-2027';

update public.academic_years
set active = true
where name = '2026-2027';

create or replace function public.active_academic_year_id()
returns uuid
language sql
stable
as $$
  select id
  from public.academic_years
  where active = true
  order by created_at desc
  limit 1
$$;

create or replace function public.set_default_academic_year_id()
returns trigger
language plpgsql
as $$
begin
  if new.academic_year_id is null then
    new.academic_year_id = public.active_academic_year_id();
  end if;

  return new;
end;
$$;

alter table public.courses add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.students add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.teacher_assignments add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.partial_grades add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.evaluation_criteria add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.term_subject_grades add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.evaluation_publications add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.student_attendance add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.student_incidents add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.student_observations add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.notifications add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.quarter_final_grades add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.annual_evaluation_weights add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.final_course_grades add column if not exists academic_year_id uuid references public.academic_years(id);
alter table public.final_evaluation_publications add column if not exists academic_year_id uuid references public.academic_years(id);

update public.courses set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.students set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.teacher_assignments set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.partial_grades set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.evaluation_criteria set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.term_subject_grades set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.evaluation_publications set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.student_attendance set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.student_incidents set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.student_observations set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.notifications set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.quarter_final_grades set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.annual_evaluation_weights set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.final_course_grades set academic_year_id = public.active_academic_year_id() where academic_year_id is null;
update public.final_evaluation_publications set academic_year_id = public.active_academic_year_id() where academic_year_id is null;

alter table public.courses alter column academic_year_id set not null;
alter table public.students alter column academic_year_id set not null;
alter table public.teacher_assignments alter column academic_year_id set not null;
alter table public.partial_grades alter column academic_year_id set not null;
alter table public.evaluation_criteria alter column academic_year_id set not null;
alter table public.term_subject_grades alter column academic_year_id set not null;
alter table public.evaluation_publications alter column academic_year_id set not null;
alter table public.student_attendance alter column academic_year_id set not null;
alter table public.student_incidents alter column academic_year_id set not null;
alter table public.student_observations alter column academic_year_id set not null;
alter table public.notifications alter column academic_year_id set not null;
alter table public.quarter_final_grades alter column academic_year_id set not null;
alter table public.annual_evaluation_weights alter column academic_year_id set not null;
alter table public.final_course_grades alter column academic_year_id set not null;
alter table public.final_evaluation_publications alter column academic_year_id set not null;

drop trigger if exists courses_default_academic_year on public.courses;
create trigger courses_default_academic_year
before insert on public.courses
for each row execute function public.set_default_academic_year_id();

drop trigger if exists students_default_academic_year on public.students;
create trigger students_default_academic_year
before insert on public.students
for each row execute function public.set_default_academic_year_id();

drop trigger if exists teacher_assignments_default_academic_year on public.teacher_assignments;
create trigger teacher_assignments_default_academic_year
before insert on public.teacher_assignments
for each row execute function public.set_default_academic_year_id();

drop trigger if exists partial_grades_default_academic_year on public.partial_grades;
create trigger partial_grades_default_academic_year
before insert on public.partial_grades
for each row execute function public.set_default_academic_year_id();

drop trigger if exists evaluation_criteria_default_academic_year on public.evaluation_criteria;
create trigger evaluation_criteria_default_academic_year
before insert on public.evaluation_criteria
for each row execute function public.set_default_academic_year_id();

drop trigger if exists term_subject_grades_default_academic_year on public.term_subject_grades;
create trigger term_subject_grades_default_academic_year
before insert on public.term_subject_grades
for each row execute function public.set_default_academic_year_id();

drop trigger if exists evaluation_publications_default_academic_year on public.evaluation_publications;
create trigger evaluation_publications_default_academic_year
before insert on public.evaluation_publications
for each row execute function public.set_default_academic_year_id();

drop trigger if exists student_attendance_default_academic_year on public.student_attendance;
create trigger student_attendance_default_academic_year
before insert on public.student_attendance
for each row execute function public.set_default_academic_year_id();

drop trigger if exists student_incidents_default_academic_year on public.student_incidents;
create trigger student_incidents_default_academic_year
before insert on public.student_incidents
for each row execute function public.set_default_academic_year_id();

drop trigger if exists student_observations_default_academic_year on public.student_observations;
create trigger student_observations_default_academic_year
before insert on public.student_observations
for each row execute function public.set_default_academic_year_id();

drop trigger if exists notifications_default_academic_year on public.notifications;
create trigger notifications_default_academic_year
before insert on public.notifications
for each row execute function public.set_default_academic_year_id();

drop trigger if exists quarter_final_grades_default_academic_year on public.quarter_final_grades;
create trigger quarter_final_grades_default_academic_year
before insert on public.quarter_final_grades
for each row execute function public.set_default_academic_year_id();

drop trigger if exists annual_evaluation_weights_default_academic_year on public.annual_evaluation_weights;
create trigger annual_evaluation_weights_default_academic_year
before insert on public.annual_evaluation_weights
for each row execute function public.set_default_academic_year_id();

drop trigger if exists final_course_grades_default_academic_year on public.final_course_grades;
create trigger final_course_grades_default_academic_year
before insert on public.final_course_grades
for each row execute function public.set_default_academic_year_id();

drop trigger if exists final_evaluation_publications_default_academic_year on public.final_evaluation_publications;
create trigger final_evaluation_publications_default_academic_year
before insert on public.final_evaluation_publications
for each row execute function public.set_default_academic_year_id();

create index if not exists courses_academic_year_idx on public.courses (academic_year_id, name);
create index if not exists students_academic_year_idx on public.students (academic_year_id, course_id, active);
create index if not exists teacher_assignments_academic_year_idx on public.teacher_assignments (academic_year_id, teacher_id, course_id, subject_id);
create index if not exists partial_grades_academic_year_idx on public.partial_grades (academic_year_id, teacher_id, course_id, subject_id, term);
create index if not exists evaluation_criteria_academic_year_idx on public.evaluation_criteria (academic_year_id, teacher_id, course_id, subject_id, term, active);
create index if not exists term_subject_grades_academic_year_idx on public.term_subject_grades (academic_year_id, teacher_id, course_id, subject_id, term, status);
create index if not exists evaluation_publications_academic_year_idx on public.evaluation_publications (academic_year_id, course_id, term, published);
create index if not exists student_attendance_academic_year_idx on public.student_attendance (academic_year_id, student_id, date);
create index if not exists student_incidents_academic_year_idx on public.student_incidents (academic_year_id, student_id, tutor_id, created_at);
create index if not exists student_observations_academic_year_idx on public.student_observations (academic_year_id, student_id, tutor_id, created_at);
create index if not exists notifications_academic_year_idx on public.notifications (academic_year_id, student_id, created_at);
create index if not exists final_course_grades_academic_year_idx on public.final_course_grades (academic_year_id, teacher_id, course_id, subject_id, status);

drop index if exists partial_grades_unique_assessment_idx;
create unique index if not exists partial_grades_unique_assessment_year_idx
on public.partial_grades (academic_year_id, student_id, subject_id, term, assessment_type, assessment_name);

alter table public.evaluation_criteria drop constraint if exists evaluation_criteria_unique_name;
alter table public.evaluation_criteria
add constraint evaluation_criteria_unique_name_year unique (academic_year_id, teacher_id, course_id, subject_id, term, name);

alter table public.term_subject_grades drop constraint if exists term_subject_grades_unique_student_subject_term;
alter table public.term_subject_grades
add constraint term_subject_grades_unique_student_subject_term_year unique (academic_year_id, student_id, subject_id, term);

alter table public.evaluation_publications drop constraint if exists evaluation_publications_unique_course_term;
alter table public.evaluation_publications
add constraint evaluation_publications_unique_course_term_year unique (academic_year_id, course_id, term);

alter table public.student_attendance drop constraint if exists student_attendance_student_date_unique;
alter table public.student_attendance
add constraint student_attendance_student_date_year_unique unique (academic_year_id, student_id, date);

alter table public.quarter_final_grades drop constraint if exists quarter_final_grades_unique_student_term;
alter table public.quarter_final_grades
add constraint quarter_final_grades_unique_student_term_year unique (academic_year_id, student_id, subject_id, teacher_id, course_id, term);

alter table public.annual_evaluation_weights drop constraint if exists annual_weights_unique;
alter table public.annual_evaluation_weights
add constraint annual_weights_unique_year unique (academic_year_id, teacher_id, course_id, subject_id);

alter table public.final_course_grades drop constraint if exists final_course_grades_unique;
alter table public.final_course_grades
add constraint final_course_grades_unique_year unique (academic_year_id, student_id, subject_id);

alter table public.final_evaluation_publications drop constraint if exists final_evaluation_publications_unique_course;
alter table public.final_evaluation_publications
add constraint final_evaluation_publications_unique_course_year unique (academic_year_id, course_id);

alter table public.academic_years enable row level security;

drop policy if exists "academic_years_superadmin_all" on public.academic_years;
create policy "academic_years_superadmin_all"
on public.academic_years
for all
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

drop policy if exists "academic_years_director_select" on public.academic_years;
create policy "academic_years_director_select"
on public.academic_years
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "academic_years_active_select" on public.academic_years;
create policy "academic_years_active_select"
on public.academic_years
for select
to authenticated
using (
  active = true
  and (
    public.current_user_has_role('tutor')
    or public.current_user_has_role('family')
  )
);
