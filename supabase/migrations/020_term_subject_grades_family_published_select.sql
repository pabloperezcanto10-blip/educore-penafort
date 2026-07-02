drop policy if exists "term_subject_grades_family_select_published" on public.term_subject_grades;

create policy "term_subject_grades_family_select_published"
on public.term_subject_grades
for select
to authenticated
using (
  status = 'closed'
  and exists (
    select 1
    from public.parent_students ps
    where ps.parent_id = auth.uid()
      and ps.student_id = term_subject_grades.student_id
  )
  and exists (
    select 1
    from public.evaluation_publications ep
    where ep.course_id = term_subject_grades.course_id
      and ep.term = term_subject_grades.term
      and ep.published = true
  )
);
