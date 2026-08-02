-- STAGING ONLY
-- MANUAL ROLLBACK FOR SPRINT 20.2L2 / MIGRATION 041
-- DO NOT APPLY TO PRODUCTION
--
-- Recreates exactly the eight audited pre-041 legacy uniqueness objects.
-- Run only after confirming that every legacy key remains duplicate-free.

begin;

lock table public.partial_grades in access exclusive mode;
lock table public.evaluation_criteria in access exclusive mode;
lock table public.quarter_final_grades in access exclusive mode;
lock table public.term_subject_grades in access exclusive mode;
lock table public.evaluation_publications in access exclusive mode;
lock table public.annual_evaluation_weights in access exclusive mode;
lock table public.final_course_grades in access exclusive mode;
lock table public.final_evaluation_publications in access exclusive mode;

do $rollback_preconditions$
begin
  if to_regclass('public.partial_grades_unique_assessment_year_idx') is not null
     or exists (
       select 1
       from pg_constraint
       where conname in (
         'evaluation_criteria_unique_name_year',
         'quarter_final_grades_unique_student_term_year',
         'term_subject_grades_unique_student_subject_term_year',
         'evaluation_publications_unique_course_term_year',
         'annual_weights_unique_year',
         'final_course_grades_unique_year',
         'final_evaluation_publications_unique_course_year'
       )
     ) then
    raise exception 'Refusing 041 rollback: a legacy uniqueness object already exists.';
  end if;

  if exists (
    select 1 from public.partial_grades
    group by academic_year_id, student_id, subject_id, term, assessment_type, assessment_name
    having count(*) > 1
  ) or exists (
    select 1 from public.evaluation_criteria
    group by academic_year_id, teacher_id, course_id, subject_id, term, name
    having count(*) > 1
  ) or exists (
    select 1 from public.quarter_final_grades
    group by academic_year_id, student_id, subject_id, teacher_id, course_id, term
    having count(*) > 1
  ) or exists (
    select 1 from public.term_subject_grades
    group by academic_year_id, student_id, subject_id, term
    having count(*) > 1
  ) or exists (
    select 1 from public.evaluation_publications
    group by academic_year_id, course_id, term
    having count(*) > 1
  ) or exists (
    select 1 from public.annual_evaluation_weights
    group by academic_year_id, teacher_id, course_id, subject_id
    having count(*) > 1
  ) or exists (
    select 1 from public.final_course_grades
    group by academic_year_id, student_id, subject_id
    having count(*) > 1
  ) or exists (
    select 1 from public.final_evaluation_publications
    group by academic_year_id, course_id
    having count(*) > 1
  ) then
    raise exception 'Refusing 041 rollback: legacy-key duplicates exist.';
  end if;
end
$rollback_preconditions$;

create unique index partial_grades_unique_assessment_year_idx
  on public.partial_grades
  (academic_year_id, student_id, subject_id, term, assessment_type, assessment_name);

alter table public.evaluation_criteria add constraint
  evaluation_criteria_unique_name_year unique
  (academic_year_id, teacher_id, course_id, subject_id, term, name);
alter table public.quarter_final_grades add constraint
  quarter_final_grades_unique_student_term_year unique
  (academic_year_id, student_id, subject_id, teacher_id, course_id, term);
alter table public.term_subject_grades add constraint
  term_subject_grades_unique_student_subject_term_year unique
  (academic_year_id, student_id, subject_id, term);
alter table public.evaluation_publications add constraint
  evaluation_publications_unique_course_term_year unique
  (academic_year_id, course_id, term);
alter table public.annual_evaluation_weights add constraint
  annual_weights_unique_year unique
  (academic_year_id, teacher_id, course_id, subject_id);
alter table public.final_course_grades add constraint
  final_course_grades_unique_year unique
  (academic_year_id, student_id, subject_id);
alter table public.final_evaluation_publications add constraint
  final_evaluation_publications_unique_course_year unique
  (academic_year_id, course_id);

commit;
