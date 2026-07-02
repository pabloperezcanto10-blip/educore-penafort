create unique index if not exists partial_grades_unique_assessment_idx
on public.partial_grades (student_id, subject_id, term, assessment_type, assessment_name);
