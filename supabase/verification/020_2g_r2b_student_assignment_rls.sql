-- SPRINT 20.2G-R2B - STAGING ONLY
-- Exercise the proposed students SELECT policy against the persistent
-- 20_2G_QA fixtures. Every policy and fixture write is rolled back.

begin;

do $fixture_guard$
begin
  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and last_name in ('A', 'B')
  ) <> 2 then
    raise exception '20_2G_QA student fixtures are incomplete.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where teacher_id = '20e10000-0000-4000-8000-000000000103'::uuid
      and school_id in (
        '20f20000-0000-4000-8000-000000000001'::uuid,
        '20e10000-0000-4000-8000-000000000001'::uuid
      )
  ) <> 2 then
    raise exception '20_2G_QA multischool assignments are incomplete.';
  end if;
end
$fixture_guard$;

alter policy "students_tutor_can_read_assigned_students"
on public.students
using (
  public.has_school_role(
    students.school_id,
    array['tutor']::public.app_role[]
  )
  and (
    students.tutor_teacher_id = auth.uid()
    or exists (
      select 1
      from public.teacher_assignments assignment
      where assignment.teacher_id = auth.uid()
        and assignment.school_id = students.school_id
        and assignment.course_id = students.course_id
        and assignment.academic_year_id = students.academic_year_id
    )
  )
);

-- A synthetic course without a multischool tutor assignment proves that the
-- role alone never grants all students in an authorized school.
insert into public.courses (id, name, academic_year_id, school_id)
values (
  '20f2b000-0000-4000-8000-000000000001',
  '20_2G_R2B Unassigned Course',
  '20f30000-0000-4000-8000-000000000001',
  '20f20000-0000-4000-8000-000000000001'
);

insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  active,
  academic_year_id,
  school_id
)
values (
  '20f2b000-0000-4000-8000-000000000101',
  '20_2G_R2B Student',
  'Unassigned',
  '20f2b000-0000-4000-8000-000000000001',
  (
    select id
    from public.profiles
    where full_name = '20_2G_QA Tutor A'
  ),
  true,
  '20f30000-0000-4000-8000-000000000001',
  '20f20000-0000-4000-8000-000000000001'
);

-- Tutor multischool: one assigned student in each authorized school, no
-- student from a course without a matching assignment.
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $multischool_tutor$
begin
  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) <> 1 then
    raise exception 'Multischool tutor cannot read exactly Student A.';
  end if;

  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20e10000-0000-4000-8000-000000000001'::uuid
  ) <> 1 then
    raise exception 'Multischool tutor cannot read exactly Student B.';
  end if;

  if exists (
    select 1
    from public.students
    where id = '20f2b000-0000-4000-8000-000000000101'::uuid
  ) then
    raise exception 'Tutor role granted a student without a matching assignment.';
  end if;

  if exists (
    select 1
    from public.students
    where school_id = '20f20000-0000-4000-8000-000000000001'::uuid
      and id = (
        select id
        from public.students
        where name = '20_2G_QA Student'
          and last_name = 'B'
      )
  ) then
    raise exception 'A School B student survived a School A scoped lookup.';
  end if;
end
$multischool_tutor$;
reset role;

-- Direct tutors retain their original access and remain isolated.
select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from public.profiles
    where full_name = '20_2G_QA Tutor A'
  ),
  true
);
set local role authenticated;
do $tutor_a$
begin
  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) <> 1 then
    raise exception 'Tutor A lost direct access to Student A.';
  end if;

  if exists (
    select 1
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20e10000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Tutor A can read Student B.';
  end if;
end
$tutor_a$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from public.profiles
    where full_name = '20_2G_QA Tutor B'
  ),
  true
);
set local role authenticated;
do $tutor_b$
begin
  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20e10000-0000-4000-8000-000000000001'::uuid
  ) <> 1 then
    raise exception 'Tutor B lost direct access to Student B.';
  end if;

  if exists (
    select 1
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Tutor B can read Student A.';
  end if;
end
$tutor_b$;
reset role;

-- An inactive membership blocks only that school and cannot borrow the other
-- active membership.
savepoint inactive_membership;
update public.school_memberships
set active = false
where user_id = '20e10000-0000-4000-8000-000000000103'::uuid
  and school_id = '20f20000-0000-4000-8000-000000000001'::uuid;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
set local role authenticated;
do $inactive_membership_check$
begin
  if exists (
    select 1
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Inactive School A membership still grants Student A.';
  end if;

  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20e10000-0000-4000-8000-000000000001'::uuid
  ) <> 1 then
    raise exception 'School B active membership was affected by School A revocation.';
  end if;
end
$inactive_membership_check$;
reset role;
rollback to savepoint inactive_membership;

-- An inactive school blocks its rows even when the membership and assignment
-- remain stored.
savepoint inactive_school;
update public.schools
set active = false
where id = '20f20000-0000-4000-8000-000000000001'::uuid;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
set local role authenticated;
do $inactive_school_check$
begin
  if exists (
    select 1
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Inactive School A still grants Student A.';
  end if;
end
$inactive_school_check$;
reset role;
rollback to savepoint inactive_school;

-- A role incompatible with the tutor policy cannot reuse a historical
-- assignment.
savepoint incompatible_role;
update public.school_memberships
set role = 'family'::public.app_role
where user_id = '20e10000-0000-4000-8000-000000000103'::uuid
  and school_id = '20f20000-0000-4000-8000-000000000001'::uuid;
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000103',
  true
);
set local role authenticated;
do $incompatible_role_check$
begin
  if exists (
    select 1
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'A non-tutor membership reused a teacher assignment.';
  end if;
end
$incompatible_role_check$;
reset role;
rollback to savepoint incompatible_role;

-- Existing negative identities remain unable to read students.
select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from public.profiles
    where full_name = '20_2G_QA Inactive'
  ),
  true
);
set local role authenticated;
do $inactive_user$
begin
  if exists (
    select 1
    from public.students
    where name in ('20_2G_QA Student', '20_2G_R2B Student')
  ) then
    raise exception 'Inactive tutor identity received students.';
  end if;
end
$inactive_user$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000105',
  true
);
set local role authenticated;
do $no_membership_user$
begin
  if exists (
    select 1
    from public.students
    where name in ('20_2G_QA Student', '20_2G_R2B Student')
  ) then
    raise exception 'User without membership received students.';
  end if;
end
$no_membership_user$;
reset role;

-- Director, superadmin and family policies remain independent.
select set_config(
  'request.jwt.claim.sub',
  '20e10000-0000-4000-8000-000000000101',
  true
);
set local role authenticated;
do $superadmin_regression$
begin
  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
  ) <> 2 then
    raise exception 'Superadmin student supervision changed.';
  end if;
end
$superadmin_regression$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from public.profiles
    where full_name = '20_2G_QA Director A'
  ),
  true
);
set local role authenticated;
do $director_a_regression$
begin
  if (
    select count(*)
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) <> 1 or exists (
    select 1
    from public.students
    where name = '20_2G_QA Student'
      and school_id = '20e10000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Director A isolation changed.';
  end if;
end
$director_a_regression$;
reset role;

select set_config(
  'request.jwt.claim.sub',
  (
    select id::text
    from public.profiles
    where full_name = '20_2G_QA Family A'
  ),
  true
);
set local role authenticated;
do $family_a_regression$
begin
  if (
    select count(*)
    from public.parent_students
    where school_id = '20f20000-0000-4000-8000-000000000001'::uuid
  ) <> 1 or exists (
    select 1
    from public.parent_students
    where school_id = '20e10000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception 'Family A relation isolation changed.';
  end if;
end
$family_a_regression$;
reset role;

-- Cross-tenant assignments remain impossible at the integrity layer.
do $cross_tenant_assignment$
begin
  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      subject_id,
      course_id,
      academic_year_id,
      school_id
    )
    values (
      '20f2b000-0000-4000-8000-000000000201',
      '20e10000-0000-4000-8000-000000000103',
      (
        select id
        from public.subjects
        where name = '20_2G_QA Subject B'
      ),
      (
        select id
        from public.courses
        where name = '20_2G_QA Course B'
      ),
      '20e20000-0000-4000-8000-000000000001',
      '20f20000-0000-4000-8000-000000000001'
    );
    raise exception 'Cross-tenant teacher assignment was accepted.';
  exception
    when sqlstate '23514' then null;
  end;
end
$cross_tenant_assignment$;

rollback;

select '20.2G-R2B transactional RLS verification passed' as result;
