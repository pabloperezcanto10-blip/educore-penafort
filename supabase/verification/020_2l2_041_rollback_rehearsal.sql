-- SPRINT 20.2L2 / MIGRATION 041 rollback rehearsal
-- STAGING ONLY. Recreates all eight legacy objects, verifies them and rolls back.

begin;

do $preconditions$
begin
  if to_regclass('public.partial_grades_unique_assessment_year_idx') is not null
     or exists (
       select 1 from pg_constraint
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
    raise exception '20.2L2 rollback rehearsal requires post-041 state.';
  end if;
end
$preconditions$;

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

do $postconditions$
begin
  if (
    select count(*)
    from pg_class object_class
    join pg_namespace object_namespace on object_namespace.oid = object_class.relnamespace
    where object_namespace.nspname = 'public'
      and object_class.relname in (
        'partial_grades_unique_assessment_year_idx',
        'evaluation_criteria_unique_name_year',
        'quarter_final_grades_unique_student_term_year',
        'term_subject_grades_unique_student_subject_term_year',
        'evaluation_publications_unique_course_term_year',
        'annual_weights_unique_year',
        'final_course_grades_unique_year',
        'final_evaluation_publications_unique_course_year'
      )
  ) <> 8 then
    raise exception '20.2L2 rollback rehearsal did not recreate all legacy objects.';
  end if;
end
$postconditions$;

select '20.2L2 rollback definitions recreated successfully; transaction will roll back' as result;

rollback;
