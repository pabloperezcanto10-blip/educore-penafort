-- SPRINT 20.2F - STAGING ONLY
-- Positive relationship and RLS checks over persistent synthetic fixtures.
-- Every block runs in its own transaction and ends with ROLLBACK.

-- Fixture shape and deterministic ownership.
begin;
do $fixture_shape$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 10 then
    raise exception 'Expected ten synthetic students.';
  end if;

  if (
    select count(distinct school_id)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 2 then
    raise exception 'Synthetic students do not span exactly two active schools.';
  end if;

  if (
    select count(*)
    from public.student_families
    where student_id in (
      '202f8000-0000-4000-8000-000000000001',
      '202f8000-0000-4000-8000-000000000002',
      '202f8000-0000-4000-8000-000000000003',
      '202f8000-0000-4000-8000-000000000006',
      '202f8000-0000-4000-8000-000000000007',
      '202f8000-0000-4000-8000-000000000008'
    )
  ) <> 7 then
    raise exception 'Synthetic legacy family relations are incomplete.';
  end if;

  if (
    select count(*)
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
  ) <> 6 then
    raise exception 'Synthetic parent relations are incomplete.';
  end if;

  if (
    select count(*)
    from public.parent_students
    where parent_id = '202f1000-0000-4000-8000-000000000008'
  ) <> 2 then
    raise exception 'Family with two children was not represented.';
  end if;

  if (
    select count(*)
    from public.parent_students
    where student_id = '202f8000-0000-4000-8000-000000000001'
  ) <> 2 then
    raise exception 'Student with two responsible adults was not represented.';
  end if;

  if exists (
    select 1
    from public.student_families relation
    join public.students student on student.id = relation.student_id
    join public.families family on family.id = relation.family_id
    where relation.student_id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
      and (
        relation.school_id <> student.school_id
        or relation.school_id <> family.school_id
      )
  ) then
    raise exception 'A legacy family relation crosses tenants.';
  end if;

  if exists (
    select 1
    from public.parent_students relation
    join public.students student on student.id = relation.student_id
    where relation.id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
      and relation.school_id <> student.school_id
  ) then
    raise exception 'A parent relation crosses tenants.';
  end if;

  if exists (
    select 1
    from public.teacher_assignments assignment
    join public.courses course on course.id = assignment.course_id
    join public.subjects subject on subject.id = assignment.subject_id
    join public.academic_years academic_year on academic_year.id = assignment.academic_year_id
    where assignment.id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
      and (
        assignment.school_id <> course.school_id
        or assignment.school_id <> subject.school_id
        or assignment.school_id <> academic_year.school_id
      )
  ) then
    raise exception 'A teacher assignment crosses tenants.';
  end if;
end
$fixture_shape$;
rollback;

-- Superadmin has controlled global access through explicit memberships in both
-- active test schools, not through an unscoped policy.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $superadmin_rls$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 10 then
    raise exception 'Superadmin cannot supervise students from both explicit schools.';
  end if;

  if (
    select count(*)
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
  ) <> 6 then
    raise exception 'Superadmin cannot supervise parent relations from both schools.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
  ) <> 7 then
    raise exception 'Superadmin cannot supervise assignments from both schools.';
  end if;
end
$superadmin_rls$;
rollback;

-- Director A sees only School A students and cannot mutate memberships.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $director_a_rls$
declare
  changed_rows integer;
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 5 then
    raise exception 'Director A did not receive exactly five School A students.';
  end if;

  if exists (
    select 1
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
      and school_id <> '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Director A can see a student from another school.';
  end if;

  begin
    update public.school_memberships
    set role = 'superadmin'
    where id = '202f1100-0000-4000-8000-000000000003';
    get diagnostics changed_rows = row_count;
  exception
    when insufficient_privilege then
      changed_rows := 0;
  end;

  if changed_rows <> 0 then
    raise exception 'Director A modified its membership role.';
  end if;
end
$director_a_rls$;
rollback;

-- Director B sees only School B students. The extra membership in the
-- inactive school cannot create people rows because the people trigger rejects
-- inactive schools.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $director_b_rls$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 5 then
    raise exception 'Director B did not receive exactly five School B students.';
  end if;

  if exists (
    select 1
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
      and school_id <> '20e10000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Director B can see a student from another active school.';
  end if;
end
$director_b_rls$;
rollback;

-- A multischool tutor sees only rows explicitly assigned to that identity in
-- each school. No membership ordering participates in the policy.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $multischool_tutor_rls$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 4 then
    raise exception 'Multischool tutor did not receive exactly four assigned students.';
  end if;

  if (
    select count(distinct school_id)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 2 then
    raise exception 'Multischool tutor did not resolve both authorized schools.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
  ) <> 2 then
    raise exception 'Multischool tutor assignments were mixed or omitted.';
  end if;
end
$multischool_tutor_rls$;
rollback;

-- Single-school tutor sees only its own students and assignments.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $single_school_tutor_rls$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 2 then
    raise exception 'Tutor A did not receive exactly two assigned students.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
  ) <> 2 then
    raise exception 'Tutor A did not receive exactly two assignments.';
  end if;
end
$single_school_tutor_rls$;
rollback;

-- Family with two children sees exactly its two authorized relations.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000008', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $family_multi_rls$
begin
  if (
    select count(*)
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
  ) <> 2 then
    raise exception 'Family Multi did not receive exactly two child relations.';
  end if;

  if exists (
    select 1
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
      and student_id not in (
        '202f8000-0000-4000-8000-000000000001',
        '202f8000-0000-4000-8000-000000000002'
      )
  ) then
    raise exception 'Family Multi can see an unrelated child.';
  end if;
end
$family_multi_rls$;
rollback;

-- The second responsible adult sees only the shared child.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000009', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $family_second_rls$
begin
  if (
    select count(*)
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
  ) <> 1 then
    raise exception 'Second responsible adult did not receive exactly one child.';
  end if;

  if not exists (
    select 1
    from public.parent_students
    where student_id = '202f8000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Second responsible adult cannot see the shared child.';
  end if;
end
$family_second_rls$;
rollback;

-- Inactive family membership leaves the historical relation intact but grants
-- zero rows.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $inactive_family_rls$
begin
  if (
    select count(*)
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
  ) <> 0 then
    raise exception 'Inactive family membership grants access.';
  end if;
end
$inactive_family_rls$;
rollback;

-- Inactive tutor membership leaves historical rows intact but grants zero
-- students and assignments.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000007', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $inactive_tutor_rls$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 0 then
    raise exception 'Inactive tutor membership grants student access.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
  ) <> 0 then
    raise exception 'Inactive tutor membership grants assignment access.';
  end if;
end
$inactive_tutor_rls$;
rollback;

-- A user without memberships receives zero people rows.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000012', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $no_membership_rls$
begin
  if (select count(*) from public.students) <> 0
     or (select count(*) from public.parent_students) <> 0
     or (select count(*) from public.teacher_assignments) <> 0 then
    raise exception 'No-membership user received people rows.';
  end if;
end
$no_membership_rls$;
rollback;

-- A director membership is incompatible with family and tutor resources. Its
-- valid director access to School A students remains intentional.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000013', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $incompatible_role_rls$
begin
  if (
    select count(*)
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
  ) <> 0 then
    raise exception 'Director role received family relations.';
  end if;

  if (
    select count(*)
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
  ) <> 0 then
    raise exception 'Director role received tutor assignments.';
  end if;
end
$incompatible_role_rls$;
rollback;

-- A director cannot create students through client RLS.
begin;
select set_config('request.jwt.claim.sub', '202f1000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $director_write_rejected$
begin
  begin
    insert into public.students (
      id,
      name,
      last_name,
      course_id,
      tutor_teacher_id,
      academic_year_id
    )
    values (
      '202fb000-0000-4000-8000-000000000201',
      '20_2F RLS Negative',
      'Director Insert',
      '202f3000-0000-4000-8000-000000000001',
      '202f1000-0000-4000-8000-000000000005',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: director inserted a student.';
  exception
    when insufficient_privilege then null;
  end;
end
$director_write_rejected$;
rollback;

select
  '20_2F people and RLS checks passed' as result,
  12 as transactional_blocks;
