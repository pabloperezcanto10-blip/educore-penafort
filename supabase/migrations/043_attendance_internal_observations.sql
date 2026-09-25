-- Attendance notes belong to the existing private observation model.
-- Both writes share a transaction; family-readable attendance never stores new private text.
begin;

alter table public.student_observations
  add column school_id uuid references public.schools(id),
  add column attendance_record_id uuid unique references public.attendance_records(id) on delete cascade,
  add column daily_attendance_id uuid unique references public.student_attendance(id) on delete cascade,
  add column observation_date date,
  add column author_name text,
  add constraint student_observations_one_attendance_source
    check (num_nonnulls(attendance_record_id, daily_attendance_id) <= 1);

update public.student_observations o set school_id = s.school_id
from public.students s where s.id = o.student_id;

alter table public.student_observations
  alter column school_id set not null,
  add constraint student_observations_student_school_fkey
    foreign key (school_id, student_id) references public.students(school_id, id),
  add constraint student_observations_year_school_fkey
    foreign key (school_id, academic_year_id) references public.academic_years(school_id, id);

create index student_observations_school_student_date_idx
  on public.student_observations(school_id, student_id, observation_date desc);

-- Existing manual observations also receive their student's tenant without a global default.
create function public.set_observation_school()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare student_school uuid;
begin
  select school_id into student_school from public.students where id = new.student_id;
  if student_school is null or (new.school_id is not null and new.school_id <> student_school) then
    raise exception 'Observation tenant mismatch' using errcode = '23514';
  end if;
  new.school_id := student_school;
  return new;
end;
$$;
create trigger student_observations_school
before insert or update on public.student_observations
for each row execute function public.set_observation_school();

-- Original manual-observation policies remain. Linked notes are writable only through the RPC.
create policy observations_attendance_write_boundary on public.student_observations
as restrictive for all to authenticated
using (
  (attendance_record_id is null and daily_attendance_id is null)
  or exists (
    select 1 from public.school_memberships m
    join public.profiles p on p.id = m.user_id and p.active
    join public.schools sc on sc.id = m.school_id and sc.active
    where m.user_id = auth.uid() and m.school_id = student_observations.school_id
      and m.active and m.role in ('superadmin', 'director', 'tutor')
  )
)
with check (attendance_record_id is null and daily_attendance_id is null);

create policy observations_attendance_staff_read on public.student_observations
for select to authenticated using (
  (attendance_record_id is not null or daily_attendance_id is not null)
  and exists (
    select 1 from public.school_memberships m
    where m.user_id = auth.uid() and m.school_id = student_observations.school_id and m.active
      and (
        m.role in ('superadmin', 'director')
        or (m.role = 'tutor' and (
          student_observations.tutor_id = auth.uid()
          or exists (
            select 1 from public.students s
            where s.id = student_observations.student_id
              and s.school_id = student_observations.school_id
              and s.tutor_teacher_id = auth.uid()
          )
        ))
      )
  )
);

create function public.save_attendance_with_observations(
  p_school_id uuid, p_date date, p_rows jsonb, p_session_id uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_name text;
  year_row public.academic_years%rowtype;
  slot public.teacher_schedule%rowtype;
  pupil public.students%rowtype;
  course_row public.courses%rowtype;
  subject_row public.subjects%rowtype;
  item record;
  saved_id uuid;
  note text;
  note_title text;
begin
  select p.full_name into actor_name from public.profiles p
  join public.school_memberships m on m.user_id = p.id
  join public.schools sc on sc.id = m.school_id
  where p.id = actor and p.active and sc.active and m.active
    and m.school_id = p_school_id and m.role = 'tutor';
  if not found then
    raise exception 'Active teacher membership required' using errcode = '42501';
  end if;

  select * into strict year_row from public.academic_years
  where school_id = p_school_id and active;
  if p_date is null
    or (year_row.start_date is not null and p_date < year_row.start_date)
    or (year_row.end_date is not null and p_date > year_row.end_date) then
    raise exception 'Date outside academic year' using errcode = '22023';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) not between 1 and 500 then
    raise exception 'Invalid attendance rows' using errcode = '22023';
  end if;
  if (select count(distinct r.student_id) from jsonb_to_recordset(p_rows) r(student_id uuid))
    <> jsonb_array_length(p_rows) then
    raise exception 'Duplicate or missing student' using errcode = '22023';
  end if;

  if p_session_id is not null then
    select * into strict slot from public.teacher_schedule
    where id = p_session_id and teacher_id = actor and not is_break;
    if extract(isodow from p_date)::integer <> slot.weekday then
      raise exception 'Session weekday mismatch' using errcode = '22023';
    end if;
    -- The legacy recurring schedule has no school_id: fail closed for ambiguous teachers.
    if (select count(distinct school_id) from public.teacher_assignments where teacher_id = actor) <> 1 then
      raise exception 'Ambiguous schedule tenant' using errcode = '42501';
    end if;
    select * into strict course_row from public.courses
    where school_id = p_school_id and academic_year_id = year_row.id and name = slot.course_name;
    if slot.subject_name is not null then
      select * into strict subject_row from public.subjects
      where school_id = p_school_id
        and name = case slot.subject_name when 'Math' then 'Matemáticas'
          when 'Science' then 'Ciencias' else slot.subject_name end;
    end if;
    if not exists (
      select 1 from public.teacher_assignments a
      where a.school_id = p_school_id and a.academic_year_id = year_row.id
        and a.teacher_id = actor and a.course_id = course_row.id
        and (a.subject_id is null or a.subject_id = subject_row.id)
    ) then
      raise exception 'Teacher assignment required' using errcode = '42501';
    end if;
  end if;

  for item in select * from jsonb_to_recordset(p_rows) r(student_id uuid, status text, notes text)
  loop
    select * into strict pupil from public.students
    where id = item.student_id and school_id = p_school_id
      and academic_year_id = year_row.id and active;
    note := nullif(btrim(item.notes), '');
    if item.status is null or item.status not in ('present', 'absent', 'late', 'justified') then
      raise exception 'Invalid attendance status' using errcode = '22023';
    end if;

    if p_session_id is not null then
      if pupil.course_id is distinct from course_row.id then
        raise exception 'Student course mismatch' using errcode = '42501';
      end if;
      insert into public.attendance_records as a
        (student_id, teacher_id, course_id, subject_id, schedule_id, attendance_date, status, notes)
      values (pupil.id, actor, course_row.id, subject_row.id, slot.id, p_date, item.status, null)
      on conflict (student_id, schedule_id, attendance_date) do update
        set status = excluded.status, notes = null
        where a.teacher_id = actor and a.course_id = excluded.course_id
      returning id into saved_id;
      note_title := concat_ws(' · ', subject_row.name, course_row.name,
        left(slot.start_time::text, 5) || ' - ' || left(slot.end_time::text, 5));
    else
      if pupil.tutor_teacher_id is distinct from actor or item.status = 'justified' then
        raise exception 'Daily attendance tutor or status mismatch' using errcode = '42501';
      end if;
      insert into public.student_attendance as a
        (student_id, tutor_id, academic_year_id, date, status, notes)
      values (pupil.id, actor, year_row.id, p_date, item.status, null)
      on conflict (academic_year_id, student_id, date) do update
        set status = excluded.status, notes = null
        where a.tutor_id = actor and a.academic_year_id = year_row.id
      returning id into saved_id;
      note_title := 'Asistencia diaria';
    end if;
    if saved_id is null then
      raise exception 'Attendance ownership mismatch' using errcode = '42501';
    end if;

    if note is null then
      delete from public.student_observations
      where school_id = p_school_id and tutor_id = actor and
        ((p_session_id is not null and attendance_record_id = saved_id)
          or (p_session_id is null and daily_attendance_id = saved_id));
    elsif p_session_id is not null then
      insert into public.student_observations as o
        (school_id, student_id, tutor_id, academic_year_id, type, title, content, priority,
         attendance_record_id, observation_date, author_name)
      values (p_school_id, pupil.id, actor, year_row.id, 'asistencia', note_title, note, 'baja',
        saved_id, p_date, actor_name)
      on conflict (attendance_record_id) do update set content = excluded.content
        where o.school_id = excluded.school_id and o.student_id = excluded.student_id and o.tutor_id = actor;
    else
      insert into public.student_observations as o
        (school_id, student_id, tutor_id, academic_year_id, type, title, content, priority,
         daily_attendance_id, observation_date, author_name)
      values (p_school_id, pupil.id, actor, year_row.id, 'asistencia', note_title, note, 'baja',
        saved_id, p_date, actor_name)
      on conflict (daily_attendance_id) do update set content = excluded.content
        where o.school_id = excluded.school_id and o.student_id = excluded.student_id and o.tutor_id = actor;
    end if;
  end loop;
end;
$$;

revoke all on function public.save_attendance_with_observations(uuid, date, jsonb, uuid) from public, anon;
grant execute on function public.save_attendance_with_observations(uuid, date, jsonb, uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
