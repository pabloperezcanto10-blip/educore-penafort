-- DO NOT APPLY - DESIGN ONLY - SPRINT 20.2A
-- Proposed Wave 4. Sources are explicit; audit logs may remain global.

begin;

alter table public.annual_evaluation_weights add column if not exists school_id uuid references public.schools(id);
alter table public.attendance_records add column if not exists school_id uuid references public.schools(id);
alter table public.audit_logs add column if not exists school_id uuid references public.schools(id);
alter table public.evaluation_criteria add column if not exists school_id uuid references public.schools(id);
alter table public.evaluation_publications add column if not exists school_id uuid references public.schools(id);
alter table public.final_course_grades add column if not exists school_id uuid references public.schools(id);
alter table public.final_evaluation_publications add column if not exists school_id uuid references public.schools(id);
alter table public.internal_notifications add column if not exists school_id uuid references public.schools(id);
alter table public.notifications add column if not exists school_id uuid references public.schools(id);
alter table public.partial_grades add column if not exists school_id uuid references public.schools(id);
alter table public.quarter_final_grades add column if not exists school_id uuid references public.schools(id);
alter table public.student_attendance add column if not exists school_id uuid references public.schools(id);
alter table public.student_incidents add column if not exists school_id uuid references public.schools(id);
alter table public.student_observations add column if not exists school_id uuid references public.schools(id);
alter table public.teacher_schedule add column if not exists school_id uuid references public.schools(id);
alter table public.term_subject_grades add column if not exists school_id uuid references public.schools(id);

update public.annual_evaluation_weights row_data
set school_id = course.school_id
from public.courses course
where course.id = row_data.course_id and row_data.school_id is null;

update public.evaluation_criteria row_data
set school_id = course.school_id
from public.courses course
where course.id = row_data.course_id and row_data.school_id is null;

update public.evaluation_publications row_data
set school_id = course.school_id
from public.courses course
where course.id = row_data.course_id and row_data.school_id is null;

update public.final_evaluation_publications row_data
set school_id = course.school_id
from public.courses course
where course.id = row_data.course_id and row_data.school_id is null;

update public.attendance_records row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.student_attendance row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.partial_grades row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.quarter_final_grades row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.term_subject_grades row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.final_course_grades row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.student_incidents row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.student_observations row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.teacher_schedule
set school_id = '20f20000-0000-4000-8000-000000000001'
where school_id is null;

update public.notifications row_data
set school_id = student.school_id
from public.students student
where student.id = row_data.student_id and row_data.school_id is null;

update public.notifications row_data
set school_id = '20f20000-0000-4000-8000-000000000001'
where row_data.school_id is null
  and exists (
    select 1 from public.school_memberships sender
    where sender.user_id = row_data.sender_id
      and sender.school_id = '20f20000-0000-4000-8000-000000000001'
      and sender.active
  )
  and exists (
    select 1 from public.school_memberships receiver
    where receiver.user_id = row_data.receiver_id
      and receiver.school_id = '20f20000-0000-4000-8000-000000000001'
      and receiver.active
  );

update public.internal_notifications row_data
set school_id = '20f20000-0000-4000-8000-000000000001'
where row_data.school_id is null
  and exists (
    select 1 from public.school_memberships membership
    where membership.user_id = row_data.user_id
      and membership.school_id = '20f20000-0000-4000-8000-000000000001'
      and membership.active
  );

update public.audit_logs row_data
set school_id = '20f20000-0000-4000-8000-000000000001'
where row_data.school_id is null
  and row_data.actor_user_id is not null
  and exists (
    select 1 from public.school_memberships membership
    where membership.user_id = row_data.actor_user_id
      and membership.school_id = '20f20000-0000-4000-8000-000000000001'
      and membership.active
  );

do $postconditions$
declare
  table_name text;
  null_total bigint;
begin
  foreach table_name in array array[
    'annual_evaluation_weights', 'attendance_records',
    'evaluation_criteria', 'evaluation_publications',
    'final_course_grades', 'final_evaluation_publications',
    'internal_notifications', 'notifications', 'partial_grades',
    'quarter_final_grades', 'student_attendance', 'student_incidents',
    'student_observations', 'teacher_schedule', 'term_subject_grades'
  ]
  loop
    execute format('select count(*) from public.%I where school_id is null', table_name)
      into null_total;
    if null_total <> 0 then
      raise exception '% rows in % have no tenant source.', null_total, table_name;
    end if;
  end loop;
end
$postconditions$;

create index if not exists annual_weights_school_id_idx on public.annual_evaluation_weights (school_id);
create index if not exists attendance_records_school_id_idx on public.attendance_records (school_id);
create index if not exists audit_logs_school_id_idx on public.audit_logs (school_id);
create index if not exists evaluation_criteria_school_id_idx on public.evaluation_criteria (school_id);
create index if not exists evaluation_publications_school_id_idx on public.evaluation_publications (school_id);
create index if not exists final_course_grades_school_id_idx on public.final_course_grades (school_id);
create index if not exists final_publications_school_id_idx on public.final_evaluation_publications (school_id);
create index if not exists internal_notifications_school_id_idx on public.internal_notifications (school_id);
create index if not exists notifications_school_id_idx on public.notifications (school_id);
create index if not exists partial_grades_school_id_idx on public.partial_grades (school_id);
create index if not exists quarter_final_grades_school_id_idx on public.quarter_final_grades (school_id);
create index if not exists student_attendance_school_id_idx on public.student_attendance (school_id);
create index if not exists student_incidents_school_id_idx on public.student_incidents (school_id);
create index if not exists student_observations_school_id_idx on public.student_observations (school_id);
create index if not exists teacher_schedule_school_id_idx on public.teacher_schedule (school_id);
create index if not exists term_subject_grades_school_id_idx on public.term_subject_grades (school_id);

commit;
