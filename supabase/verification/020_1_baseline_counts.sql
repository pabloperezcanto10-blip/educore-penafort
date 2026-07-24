-- Read-only aggregate baseline for the controlled Peñafort backfill.
-- Run with a role that can read every listed table. No personal data is returned.

select 'profiles' as entity, count(*)::bigint as total from public.profiles
union all
select 'students', count(*)::bigint from public.students
union all
select 'families', count(*)::bigint from public.profiles where role = 'family'
union all
select 'parent_students', count(*)::bigint from public.parent_students
union all
select 'courses', count(*)::bigint from public.courses
union all
select 'subjects', count(*)::bigint from public.subjects
union all
select 'teacher_assignments', count(*)::bigint from public.teacher_assignments
union all
select 'communications', count(*)::bigint from public.notifications
union all
select 'student_attendance', count(*)::bigint from public.student_attendance
union all
select 'attendance_records', count(*)::bigint from public.attendance_records
union all
select 'partial_grades', count(*)::bigint from public.partial_grades
union all
select 'term_subject_grades', count(*)::bigint from public.term_subject_grades
union all
select 'final_course_grades', count(*)::bigint from public.final_course_grades
union all
select 'student_incidents', count(*)::bigint from public.student_incidents
union all
select 'student_observations', count(*)::bigint from public.student_observations
union all
select 'academic_years', count(*)::bigint from public.academic_years
order by entity;

-- No events table is defined in the versioned schema. Add it only after the
-- real schema baseline confirms its name and ownership.
