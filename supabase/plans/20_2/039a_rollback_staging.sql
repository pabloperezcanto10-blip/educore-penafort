/*
STAGING ONLY
DO NOT APPLY TO PRODUCTION
MANUAL ROLLBACK

Purpose:
  Restore the pre-039A relationship shape without deleting academic data.
  Keep school_id and its deterministic values for diagnosis and recovery.

This file is intentionally wrapped in a block comment. Remove the outer
comment only during an explicitly approved staging rollback.

begin;

lock table public.partial_grades in share row exclusive mode;
lock table public.evaluation_criteria in share row exclusive mode;
lock table public.quarter_final_grades in share row exclusive mode;
lock table public.term_subject_grades in share row exclusive mode;
lock table public.evaluation_publications in share row exclusive mode;
lock table public.annual_evaluation_weights in share row exclusive mode;
lock table public.final_course_grades in share row exclusive mode;
lock table public.final_evaluation_publications in share row exclusive mode;

drop trigger if exists zz_partial_grades_school_context on public.partial_grades;
drop trigger if exists zz_evaluation_criteria_school_context on public.evaluation_criteria;
drop trigger if exists zz_quarter_final_grades_school_context on public.quarter_final_grades;
drop trigger if exists zz_term_subject_grades_school_context on public.term_subject_grades;
drop trigger if exists zz_evaluation_publications_school_context on public.evaluation_publications;
drop trigger if exists zz_annual_evaluation_weights_school_context on public.annual_evaluation_weights;
drop trigger if exists zz_final_course_grades_school_context on public.final_course_grades;
drop trigger if exists zz_final_evaluation_publications_school_context on public.final_evaluation_publications;

alter table public.partial_grades alter column school_id drop not null;
alter table public.evaluation_criteria alter column school_id drop not null;
alter table public.quarter_final_grades alter column school_id drop not null;
alter table public.term_subject_grades alter column school_id drop not null;
alter table public.evaluation_publications alter column school_id drop not null;
alter table public.annual_evaluation_weights alter column school_id drop not null;
alter table public.final_course_grades alter column school_id drop not null;
alter table public.final_evaluation_publications alter column school_id drop not null;

alter table public.partial_grades
  drop constraint partial_grades_assignment_school_fkey,
  drop constraint partial_grades_year_school_fkey,
  drop constraint partial_grades_subject_school_fkey,
  drop constraint partial_grades_course_school_fkey,
  drop constraint partial_grades_student_school_fkey,
  drop constraint partial_grades_school_id_fkey;
alter table public.evaluation_criteria
  drop constraint evaluation_criteria_assignment_school_fkey,
  drop constraint evaluation_criteria_year_school_fkey,
  drop constraint evaluation_criteria_subject_school_fkey,
  drop constraint evaluation_criteria_course_school_fkey,
  drop constraint evaluation_criteria_school_id_fkey;
alter table public.quarter_final_grades
  drop constraint quarter_final_grades_assignment_school_fkey,
  drop constraint quarter_final_grades_year_school_fkey,
  drop constraint quarter_final_grades_subject_school_fkey,
  drop constraint quarter_final_grades_course_school_fkey,
  drop constraint quarter_final_grades_student_school_fkey,
  drop constraint quarter_final_grades_school_id_fkey;
alter table public.term_subject_grades
  drop constraint term_subject_grades_assignment_school_fkey,
  drop constraint term_subject_grades_year_school_fkey,
  drop constraint term_subject_grades_subject_school_fkey,
  drop constraint term_subject_grades_course_school_fkey,
  drop constraint term_subject_grades_student_school_fkey,
  drop constraint term_subject_grades_school_id_fkey;
alter table public.evaluation_publications
  drop constraint evaluation_publications_year_school_fkey,
  drop constraint evaluation_publications_course_school_fkey,
  drop constraint evaluation_publications_school_id_fkey;
alter table public.annual_evaluation_weights
  drop constraint annual_evaluation_weights_assignment_school_fkey,
  drop constraint annual_evaluation_weights_year_school_fkey,
  drop constraint annual_evaluation_weights_subject_school_fkey,
  drop constraint annual_evaluation_weights_course_school_fkey,
  drop constraint annual_evaluation_weights_school_id_fkey;
alter table public.final_course_grades
  drop constraint final_course_grades_assignment_school_fkey,
  drop constraint final_course_grades_year_school_fkey,
  drop constraint final_course_grades_subject_school_fkey,
  drop constraint final_course_grades_course_school_fkey,
  drop constraint final_course_grades_student_school_fkey,
  drop constraint final_course_grades_school_id_fkey;
alter table public.final_evaluation_publications
  drop constraint final_evaluation_publications_year_school_fkey,
  drop constraint final_evaluation_publications_course_school_fkey,
  drop constraint final_evaluation_publications_school_id_fkey;

alter table public.partial_grades
  add constraint partial_grades_student_id_fkey
    foreign key (student_id) references public.students(id) on delete cascade,
  add constraint partial_grades_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete restrict,
  add constraint partial_grades_subject_id_fkey
    foreign key (subject_id) references public.subjects(id) on delete restrict,
  add constraint partial_grades_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.evaluation_criteria
  add constraint evaluation_criteria_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint evaluation_criteria_subject_id_fkey
    foreign key (subject_id) references public.subjects(id) on delete cascade,
  add constraint evaluation_criteria_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.quarter_final_grades
  add constraint quarter_final_grades_student_id_fkey
    foreign key (student_id) references public.students(id) on delete cascade,
  add constraint quarter_final_grades_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint quarter_final_grades_subject_id_fkey
    foreign key (subject_id) references public.subjects(id) on delete cascade,
  add constraint quarter_final_grades_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.term_subject_grades
  add constraint term_subject_grades_student_id_fkey
    foreign key (student_id) references public.students(id) on delete cascade,
  add constraint term_subject_grades_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint term_subject_grades_subject_id_fkey
    foreign key (subject_id) references public.subjects(id) on delete cascade,
  add constraint term_subject_grades_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.evaluation_publications
  add constraint evaluation_publications_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint evaluation_publications_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.annual_evaluation_weights
  add constraint annual_evaluation_weights_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint annual_evaluation_weights_subject_id_fkey
    foreign key (subject_id) references public.subjects(id) on delete cascade,
  add constraint annual_evaluation_weights_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.final_course_grades
  add constraint final_course_grades_student_id_fkey
    foreign key (student_id) references public.students(id) on delete cascade,
  add constraint final_course_grades_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint final_course_grades_subject_id_fkey
    foreign key (subject_id) references public.subjects(id) on delete cascade,
  add constraint final_course_grades_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);
alter table public.final_evaluation_publications
  add constraint final_evaluation_publications_course_id_fkey
    foreign key (course_id) references public.courses(id) on delete cascade,
  add constraint final_evaluation_publications_academic_year_id_fkey
    foreign key (academic_year_id) references public.academic_years(id);

drop index if exists public.partial_grades_id_school_id_uidx;
drop index if exists public.evaluation_criteria_id_school_id_uidx;
drop index if exists public.quarter_final_grades_id_school_id_uidx;
drop index if exists public.term_subject_grades_id_school_id_uidx;
drop index if exists public.evaluation_publications_id_school_id_uidx;
drop index if exists public.annual_evaluation_weights_id_school_id_uidx;
drop index if exists public.final_course_grades_id_school_id_uidx;
drop index if exists public.final_evaluation_publications_id_school_id_uidx;
drop index if exists public.partial_grades_school_assessment_uidx;
drop index if exists public.evaluation_criteria_school_name_uidx;
drop index if exists public.quarter_final_grades_school_term_uidx;
drop index if exists public.term_subject_grades_school_term_uidx;
drop index if exists public.evaluation_publications_school_term_uidx;
drop index if exists public.annual_weights_school_uidx;
drop index if exists public.final_course_grades_school_uidx;
drop index if exists public.final_publications_school_uidx;
drop index if exists public.partial_grades_school_lookup_idx;
drop index if exists public.partial_grades_school_student_idx;
drop index if exists public.evaluation_criteria_school_lookup_idx;
drop index if exists public.quarter_final_grades_school_lookup_idx;
drop index if exists public.term_subject_grades_school_lookup_idx;
drop index if exists public.term_subject_grades_school_student_idx;
drop index if exists public.evaluation_publications_school_lookup_idx;
drop index if exists public.final_course_grades_school_lookup_idx;
drop index if exists public.final_course_grades_school_student_idx;
drop index if exists public.final_evaluation_publications_school_lookup_idx;

drop function if exists public.set_and_validate_academic_operation_school();

-- school_id is intentionally retained and no academic row is deleted.
commit;
*/
