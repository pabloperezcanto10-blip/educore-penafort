-- Sprint 20.2A - proposed post-backfill checks for Sprint 20.2B.
-- READ ONLY. Run only after proposed columns exist.

select 'academic_years_school_null' as check_name, count(*)::bigint as total
from public.academic_years where school_id is null
union all select 'courses_school_null', count(*) from public.courses where school_id is null
union all select 'subjects_school_null', count(*) from public.subjects where school_id is null
union all select 'course_subjects_school_null', count(*) from public.course_subjects where school_id is null
union all select 'students_school_null', count(*) from public.students where school_id is null
union all select 'families_school_null', count(*) from public.families where school_id is null
union all select 'student_families_school_null', count(*) from public.student_families where school_id is null
union all select 'parent_students_school_null', count(*) from public.parent_students where school_id is null
union all select 'teachers_school_null', count(*) from public.teachers where school_id is null
union all select 'teacher_assignments_school_null', count(*) from public.teacher_assignments where school_id is null
union all select 'teacher_schedule_school_null', count(*) from public.teacher_schedule where school_id is null
union all select 'attendance_records_school_null', count(*) from public.attendance_records where school_id is null
union all select 'student_attendance_school_null', count(*) from public.student_attendance where school_id is null
union all select 'evaluation_criteria_school_null', count(*) from public.evaluation_criteria where school_id is null
union all select 'annual_weights_school_null', count(*) from public.annual_evaluation_weights where school_id is null
union all select 'partial_grades_school_null', count(*) from public.partial_grades where school_id is null
union all select 'quarter_grades_school_null', count(*) from public.quarter_final_grades where school_id is null
union all select 'term_grades_school_null', count(*) from public.term_subject_grades where school_id is null
union all select 'final_grades_school_null', count(*) from public.final_course_grades where school_id is null
union all select 'evaluation_publications_school_null', count(*) from public.evaluation_publications where school_id is null
union all select 'final_publications_school_null', count(*) from public.final_evaluation_publications where school_id is null
union all select 'student_incidents_school_null', count(*) from public.student_incidents where school_id is null
union all select 'student_observations_school_null', count(*) from public.student_observations where school_id is null
union all select 'notifications_school_null', count(*) from public.notifications where school_id is null
union all select 'internal_notifications_school_null', count(*) from public.internal_notifications where school_id is null
order by check_name;

select 'student_course_cross_tenant' as check_name, count(*)::bigint as total
from public.students student
join public.courses course on course.id = student.course_id
where student.school_id is distinct from course.school_id
union all
select 'course_subject_course_cross_tenant', count(*)
from public.course_subjects relation
join public.courses course on course.id = relation.course_id
where relation.school_id is distinct from course.school_id
union all
select 'course_subject_subject_cross_tenant', count(*)
from public.course_subjects relation
join public.subjects subject on subject.id = relation.subject_id
where relation.school_id is distinct from subject.school_id
union all
select 'parent_student_cross_tenant', count(*)
from public.parent_students relation
join public.students student on student.id = relation.student_id
where relation.school_id is distinct from student.school_id
union all
select 'teacher_assignment_course_cross_tenant', count(*)
from public.teacher_assignments assignment
join public.courses course on course.id = assignment.course_id
where assignment.school_id is distinct from course.school_id
union all
select 'attendance_student_cross_tenant', count(*)
from public.attendance_records record
join public.students student on student.id = record.student_id
where record.school_id is distinct from student.school_id
union all
select 'partial_grade_student_cross_tenant', count(*)
from public.partial_grades grade
join public.students student on student.id = grade.student_id
where grade.school_id is distinct from student.school_id
union all
select 'term_grade_student_cross_tenant', count(*)
from public.term_subject_grades grade
join public.students student on student.id = grade.student_id
where grade.school_id is distinct from student.school_id
union all
select 'notification_student_cross_tenant', count(*)
from public.notifications notification
join public.students student on student.id = notification.student_id
where notification.school_id is distinct from student.school_id
order by check_name;

select
  table_name,
  school_id,
  total
from (
  select 'students'::text as table_name, school_id, count(*)::bigint as total
  from public.students group by school_id
  union all
  select 'notifications', school_id, count(*) from public.notifications group by school_id
  union all
  select 'partial_grades', school_id, count(*) from public.partial_grades group by school_id
  union all
  select 'attendance_records', school_id, count(*) from public.attendance_records group by school_id
) counts
order by table_name, school_id;
