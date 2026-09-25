-- Run after 043. Uses only synthetic rows and always rolls back.
begin;
create temporary table attendance_qa_context as
select p.id teacher_id, m.school_id, y.id year_id, sc.id session_id,
  c.id course_id, gen_random_uuid() student_id,
  (select user_id from public.school_memberships
    where school_id = m.school_id and role = 'family' and active limit 1) family_id,
  (select id from public.schools where id <> m.school_id and active limit 1) other_school_id
from public.profiles p
join public.school_memberships m on m.user_id = p.id and m.active and m.role = 'tutor'
join public.academic_years y on y.school_id = m.school_id and y.active
join public.teacher_schedule sc on sc.teacher_id = p.id and sc.weekday = 1 and not sc.is_break
join public.courses c on c.school_id = m.school_id and c.academic_year_id = y.id and c.name = sc.course_name
where p.email = 'pablopereztutor@penafort.com'
order by sc.start_time limit 1;

do $$ begin
  if (select count(*) from attendance_qa_context) <> 1
    or exists (select 1 from attendance_qa_context where family_id is null or other_school_id is null) then
    raise exception 'Missing QA context';
  end if;
end $$;

insert into public.students(id, name, last_name, course_id, tutor_teacher_id, active, academic_year_id, school_id)
select student_id, 'QA Attendance', 'Rollback only', course_id, teacher_id, true, year_id, school_id
from attendance_qa_context;
insert into public.parent_students(school_id, parent_id, student_id)
select school_id, family_id, student_id from attendance_qa_context;
grant select on attendance_qa_context to authenticated;

select set_config('request.jwt.claim.sub', teacher_id::text, true) from attendance_qa_context;
set local role authenticated;

do $$
declare q record; status_value text; a_id uuid;
begin
  select * into q from attendance_qa_context;
  foreach status_value in array array['present','absent','late','justified'] loop
    perform public.save_attendance_with_observations(q.school_id, '2026-09-21',
      jsonb_build_array(jsonb_build_object('student_id', q.student_id, 'status', status_value,
        'notes', 'QA_PRIVATE_ATTENDANCE_NOTE')), q.session_id);
    if (select count(*) from public.student_observations where student_id=q.student_id) <> 1 then
      raise exception 'Duplicate or missing observation';
    end if;
    if not exists (
      select 1 from public.attendance_records a join public.student_observations o on o.attendance_record_id=a.id
      where a.student_id=q.student_id and a.status=status_value and a.notes is null
        and o.content='QA_PRIVATE_ATTENDANCE_NOTE' and o.observation_date='2026-09-21'
        and o.school_id=q.school_id and o.tutor_id=q.teacher_id
        and nullif(o.author_name,'') is not null and o.title like '% - %'
    ) then raise exception 'Saved note, date, author or context mismatch'; end if;
  end loop;
  select id into a_id from public.attendance_records where student_id=q.student_id;
  perform public.save_attendance_with_observations(q.school_id, '2026-09-21',
    jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','present','notes','QA_EDITED')),q.session_id);
  if (select content from public.student_observations where attendance_record_id=a_id) <> 'QA_EDITED' then
    raise exception 'Edit not reflected';
  end if;
  perform public.save_attendance_with_observations(q.school_id, '2026-09-28',
    jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','present','notes','QA_NEXT_DAY')),q.session_id);
  if (select count(*) from public.student_observations where student_id=q.student_id) <> 2 then
    raise exception 'Different date overwrote observation';
  end if;
  perform public.save_attendance_with_observations(q.school_id, '2026-09-28',
    jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','present','notes','  ')),q.session_id);
  if (select count(*) from public.student_observations where student_id=q.student_id) <> 1 then
    raise exception 'Clearing one date affected another date';
  end if;
  perform public.save_attendance_with_observations(q.school_id, '2026-09-21',
    jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','late','notes','QA_DAILY')));
  perform public.save_attendance_with_observations(q.school_id, '2026-09-21',
    jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','late','notes','QA_DAILY')));
  if (select count(*) from public.student_observations where student_id=q.student_id) <> 2 then
    raise exception 'Daily note missing or duplicated';
  end if;
  begin
    perform public.save_attendance_with_observations(q.other_school_id, '2026-09-21',
      jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','present','notes','FORBIDDEN')),q.session_id);
    raise exception 'Cross-tenant write allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_attendance_with_observations(q.school_id, '2026-09-22',
      jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','present','notes','WRONG_DAY')),q.session_id);
    raise exception 'Wrong weekday allowed';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_attendance_with_observations(q.school_id, '2026-09-21',
      jsonb_build_array(
        jsonb_build_object('student_id',q.student_id,'status','present','notes','DUP'),
        jsonb_build_object('student_id',q.student_id,'status','present','notes','DUP')),q.session_id);
    raise exception 'Duplicate student batch allowed';
  exception when invalid_parameter_value then null; end;
end $$;
select 'PASS: statuses, create, edit, duplicate prevention, dates, author, context, daily, tenant and weekday' as result;

reset role;
select set_config('request.jwt.claim.sub', family_id::text, true) from attendance_qa_context;
set local role authenticated;
do $$
declare q record;
begin
  select * into q from attendance_qa_context;
  if exists (select 1 from public.student_observations where student_id=q.student_id) then
    raise exception 'Family can read private observations';
  end if;
  if not exists (select 1 from public.attendance_records where student_id=q.student_id) then
    raise exception 'Family status visibility unexpectedly removed';
  end if;
  if exists (select 1 from public.attendance_records where student_id=q.student_id and notes is not null)
    or exists (select 1 from public.student_attendance where student_id=q.student_id and notes is not null) then
    raise exception 'Private note exposed in attendance';
  end if;
  begin
    perform public.save_attendance_with_observations(q.school_id, '2026-09-21',
      jsonb_build_array(jsonb_build_object('student_id',q.student_id,'status','present','notes','FORBIDDEN')),q.session_id);
    raise exception 'Family write allowed';
  exception when insufficient_privilege then null; end;
end $$;
select 'PASS: family cannot read notes or call attendance writer; attendance status remains visible' as result;
reset role;
rollback;
