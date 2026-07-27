-- Sprint 20.2A - aggregate-only production diagnostics.
-- READ ONLY. Returns counts and categories, never personal data.
-- Production intentionally remains on the 27-table pre-034 schema. The two
-- foundation tables are checked separately in staging.

select 'academic_years' as entity, count(*)::bigint as total from public.academic_years
union all select 'annual_evaluation_weights', count(*) from public.annual_evaluation_weights
union all select 'attendance_records', count(*) from public.attendance_records
union all select 'audit_logs', count(*) from public.audit_logs
union all select 'course_subjects', count(*) from public.course_subjects
union all select 'courses', count(*) from public.courses
union all select 'evaluation_criteria', count(*) from public.evaluation_criteria
union all select 'evaluation_publications', count(*) from public.evaluation_publications
union all select 'families', count(*) from public.families
union all select 'final_course_grades', count(*) from public.final_course_grades
union all select 'final_evaluation_publications', count(*) from public.final_evaluation_publications
union all select 'internal_notifications', count(*) from public.internal_notifications
union all select 'notifications', count(*) from public.notifications
union all select 'parent_students', count(*) from public.parent_students
union all select 'partial_grades', count(*) from public.partial_grades
union all select 'profiles', count(*) from public.profiles
union all select 'quarter_final_grades', count(*) from public.quarter_final_grades
union all select 'student_attendance', count(*) from public.student_attendance
union all select 'student_families', count(*) from public.student_families
union all select 'student_incidents', count(*) from public.student_incidents
union all select 'student_observations', count(*) from public.student_observations
union all select 'students', count(*) from public.students
union all select 'subjects', count(*) from public.subjects
union all select 'teacher_assignments', count(*) from public.teacher_assignments
union all select 'teacher_schedule', count(*) from public.teacher_schedule
union all select 'teachers', count(*) from public.teachers
union all select 'term_subject_grades', count(*) from public.term_subject_grades
order by entity;

select
  role::text as category,
  active,
  count(*)::bigint as total
from public.profiles
group by role, active
order by category, active;

select 'auth_user_without_profile' as anomaly, count(*)::bigint as total
from auth.users user_row
left join public.profiles profile on profile.id = user_row.id
where profile.id is null
union all
select 'profile_without_auth_user', count(*)
from public.profiles profile
left join auth.users user_row on user_row.id = profile.id
where user_row.id is null
union all
select 'multiple_active_academic_years', greatest(count(*) - 1, 0)
from public.academic_years
where active
union all
select 'student_without_course', count(*)
from public.students
where course_id is null
union all
select 'student_course_year_mismatch', count(*)
from public.students student
join public.courses course on course.id = student.course_id
where student.academic_year_id is distinct from course.academic_year_id
union all
select 'duplicate_parent_student', count(*)
from (
  select parent_id, student_id
  from public.parent_students
  group by parent_id, student_id
  having count(*) > 1
) duplicate_row
union all
select 'parent_without_family_profile', count(*)
from public.parent_students relation
left join public.profiles profile on profile.id = relation.parent_id
where profile.id is null or profile.role <> 'family'
union all
select 'duplicate_legacy_student_family', count(*)
from (
  select student_id, family_id
  from public.student_families
  group by student_id, family_id
  having count(*) > 1
) duplicate_row
union all
select 'course_subject_year_mismatch', count(*)
from public.course_subjects relation
join public.courses course on course.id = relation.course_id
where relation.academic_year_id is distinct from course.academic_year_id
union all
select 'teacher_assignment_year_mismatch', count(*)
from public.teacher_assignments assignment
join public.courses course on course.id = assignment.course_id
where assignment.academic_year_id is distinct from course.academic_year_id
union all
select 'duplicate_teacher_assignment', count(*)
from (
  select teacher_id, course_id, subject_id, academic_year_id
  from public.teacher_assignments
  group by teacher_id, course_id, subject_id, academic_year_id
  having count(*) > 1
) duplicate_row
union all
select 'notification_missing_profile', count(*)
from public.notifications notification
left join public.profiles sender on sender.id = notification.sender_id
left join public.profiles receiver on receiver.id = notification.receiver_id
where sender.id is null or receiver.id is null
union all
select 'notification_student_year_mismatch', count(*)
from public.notifications notification
join public.students student on student.id = notification.student_id
where notification.academic_year_id is distinct from student.academic_year_id
union all
select 'teacher_schedule_inactive_or_unknown_teacher', count(*)
from public.teacher_schedule schedule
left join public.profiles profile on profile.id = schedule.teacher_id
where profile.id is null or not profile.active
union all
select 'audit_actor_without_profile', count(*)
from public.audit_logs audit
left join public.profiles profile on profile.id = audit.actor_user_id
where audit.actor_user_id is not null and profile.id is null
order by anomaly;

select 'attendance_records_student_course_conflict' as anomaly, count(*)::bigint as total
from public.attendance_records record
join public.students student on student.id = record.student_id
where record.course_id is distinct from student.course_id
union all
select 'student_attendance_year_conflict', count(*)
from public.student_attendance record
join public.students student on student.id = record.student_id
where record.academic_year_id is distinct from student.academic_year_id
union all
select 'partial_grades_student_context_conflict', count(*)
from public.partial_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'quarter_grades_student_context_conflict', count(*)
from public.quarter_final_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'term_grades_student_context_conflict', count(*)
from public.term_subject_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'final_grades_student_context_conflict', count(*)
from public.final_course_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'incident_student_year_conflict', count(*)
from public.student_incidents incident
join public.students student on student.id = incident.student_id
where incident.academic_year_id is distinct from student.academic_year_id
union all
select 'observation_student_year_conflict', count(*)
from public.student_observations observation
join public.students student on student.id = observation.student_id
where observation.academic_year_id is distinct from student.academic_year_id
order by anomaly;

-- Consolidated result set for clients that return only the final query.
select 'table_count' as result_type, 'academic_years' as metric, '' as bucket, count(*)::bigint as total from public.academic_years
union all select 'table_count', 'annual_evaluation_weights', '', count(*) from public.annual_evaluation_weights
union all select 'table_count', 'attendance_records', '', count(*) from public.attendance_records
union all select 'table_count', 'audit_logs', '', count(*) from public.audit_logs
union all select 'table_count', 'course_subjects', '', count(*) from public.course_subjects
union all select 'table_count', 'courses', '', count(*) from public.courses
union all select 'table_count', 'evaluation_criteria', '', count(*) from public.evaluation_criteria
union all select 'table_count', 'evaluation_publications', '', count(*) from public.evaluation_publications
union all select 'table_count', 'families', '', count(*) from public.families
union all select 'table_count', 'final_course_grades', '', count(*) from public.final_course_grades
union all select 'table_count', 'final_evaluation_publications', '', count(*) from public.final_evaluation_publications
union all select 'table_count', 'internal_notifications', '', count(*) from public.internal_notifications
union all select 'table_count', 'notifications', '', count(*) from public.notifications
union all select 'table_count', 'parent_students', '', count(*) from public.parent_students
union all select 'table_count', 'partial_grades', '', count(*) from public.partial_grades
union all select 'table_count', 'profiles', '', count(*) from public.profiles
union all select 'table_count', 'quarter_final_grades', '', count(*) from public.quarter_final_grades
union all select 'table_count', 'student_attendance', '', count(*) from public.student_attendance
union all select 'table_count', 'student_families', '', count(*) from public.student_families
union all select 'table_count', 'student_incidents', '', count(*) from public.student_incidents
union all select 'table_count', 'student_observations', '', count(*) from public.student_observations
union all select 'table_count', 'students', '', count(*) from public.students
union all select 'table_count', 'subjects', '', count(*) from public.subjects
union all select 'table_count', 'teacher_assignments', '', count(*) from public.teacher_assignments
union all select 'table_count', 'teacher_schedule', '', count(*) from public.teacher_schedule
union all select 'table_count', 'teachers', '', count(*) from public.teachers
union all select 'table_count', 'term_subject_grades', '', count(*) from public.term_subject_grades
union all
select 'profile_count', role::text, case when active then 'active' else 'inactive' end, count(*)
from public.profiles
group by role, active
union all
select 'anomaly', 'auth_user_without_profile', '', count(*)
from auth.users user_row left join public.profiles profile on profile.id = user_row.id
where profile.id is null
union all
select 'anomaly', 'profile_without_auth_user', '', count(*)
from public.profiles profile left join auth.users user_row on user_row.id = profile.id
where user_row.id is null
union all
select 'anomaly', 'student_without_course', '', count(*) from public.students where course_id is null
union all
select 'anomaly', 'student_course_year_mismatch', '', count(*)
from public.students student join public.courses course on course.id = student.course_id
where student.academic_year_id is distinct from course.academic_year_id
union all
select 'anomaly', 'parent_without_family_profile', '', count(*)
from public.parent_students relation
left join public.profiles profile on profile.id = relation.parent_id
where profile.id is null or profile.role <> 'family'
union all
select 'anomaly', 'course_subject_year_mismatch', '', count(*)
from public.course_subjects relation join public.courses course on course.id = relation.course_id
where relation.academic_year_id is distinct from course.academic_year_id
union all
select 'anomaly', 'teacher_assignment_year_mismatch', '', count(*)
from public.teacher_assignments assignment join public.courses course on course.id = assignment.course_id
where assignment.academic_year_id is distinct from course.academic_year_id
union all
select 'anomaly', 'notification_missing_profile', '', count(*)
from public.notifications notification
left join public.profiles sender on sender.id = notification.sender_id
left join public.profiles receiver on receiver.id = notification.receiver_id
where sender.id is null or receiver.id is null
union all
select 'anomaly', 'attendance_student_course_conflict', '', count(*)
from public.attendance_records record join public.students student on student.id = record.student_id
where record.course_id is distinct from student.course_id
union all
select 'anomaly', 'partial_grade_student_context_conflict', '', count(*)
from public.partial_grades grade join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'anomaly', 'term_grade_student_context_conflict', '', count(*)
from public.term_subject_grades grade join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'anomaly', 'final_grade_student_context_conflict', '', count(*)
from public.final_course_grades grade join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
order by result_type, metric, bucket;
