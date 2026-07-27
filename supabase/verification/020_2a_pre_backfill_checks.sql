-- Sprint 20.2A - pre-backfill gate.
-- READ ONLY. Every total should be zero before Sprint 20.2B writes data.

select 'profiles_without_auth_user' as check_name, count(*)::bigint as total
from public.profiles profile
left join auth.users user_row on user_row.id = profile.id
where user_row.id is null
union all
select 'auth_users_without_profile', count(*)
from auth.users user_row
left join public.profiles profile on profile.id = user_row.id
where profile.id is null
union all
select 'students_without_course', count(*)
from public.students
where course_id is null
union all
select 'students_with_course_year_conflict', count(*)
from public.students student
join public.courses course on course.id = student.course_id
where student.academic_year_id is distinct from course.academic_year_id
union all
select 'parent_students_without_family_profile', count(*)
from public.parent_students relation
left join public.profiles profile on profile.id = relation.parent_id
where profile.id is null or profile.role <> 'family'
union all
select 'course_subjects_with_year_conflict', count(*)
from public.course_subjects relation
join public.courses course on course.id = relation.course_id
where relation.academic_year_id is distinct from course.academic_year_id
union all
select 'teacher_assignments_with_year_conflict', count(*)
from public.teacher_assignments assignment
join public.courses course on course.id = assignment.course_id
where assignment.academic_year_id is distinct from course.academic_year_id
union all
select 'attendance_with_student_course_conflict', count(*)
from public.attendance_records record
join public.students student on student.id = record.student_id
where record.course_id is distinct from student.course_id
union all
select 'partial_grades_with_student_context_conflict', count(*)
from public.partial_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'term_grades_with_student_context_conflict', count(*)
from public.term_subject_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
union all
select 'final_grades_with_student_context_conflict', count(*)
from public.final_course_grades grade
join public.students student on student.id = grade.student_id
where grade.course_id is distinct from student.course_id
   or grade.academic_year_id is distinct from student.academic_year_id
order by check_name;
