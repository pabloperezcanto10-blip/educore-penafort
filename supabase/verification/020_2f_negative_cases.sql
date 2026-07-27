-- SPRINT 20.2F - STAGING ONLY
-- Negative integrity and deterministic-resolution cases.
-- Every write in this file is reverted.

begin;

do $fixture_guard$
begin
  if (
    select count(*)
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
  ) <> 10 then
    raise exception '20_2F persistent fixtures are not loaded.';
  end if;
end
$fixture_guard$;

-- A student cannot claim a school different from its academic roots.
do $student_explicit_school_mismatch$
begin
  begin
    insert into public.students (
      id,
      name,
      last_name,
      course_id,
      tutor_teacher_id,
      academic_year_id,
      school_id
    )
    values (
      '202fb000-0000-4000-8000-000000000001',
      '20_2F Negative Student',
      'Explicit School',
      '202f3000-0000-4000-8000-000000000001',
      '202f1000-0000-4000-8000-000000000005',
      '20f30000-0000-4000-8000-000000000001',
      '20e10000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: student accepted a mismatched explicit school.';
  exception
    when sqlstate '23514' then null;
  end;
end
$student_explicit_school_mismatch$;

-- A course and academic year from different tenants cannot form a student.
do $student_cross_academic_roots$
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
      '202fb000-0000-4000-8000-000000000002',
      '20_2F Negative Student',
      'Cross Academic Roots',
      '202f3000-0000-4000-8000-000000000001',
      '202f1000-0000-4000-8000-000000000005',
      '20e20000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: student accepted cross-tenant academic roots.';
  exception
    when sqlstate '23514' then null;
  end;
end
$student_cross_academic_roots$;

-- A nonexistent school cannot be supplied by a client.
do $student_nonexistent_school$
begin
  begin
    insert into public.students (
      id,
      name,
      last_name,
      course_id,
      tutor_teacher_id,
      academic_year_id,
      school_id
    )
    values (
      '202fb000-0000-4000-8000-000000000003',
      '20_2F Negative Student',
      'Unknown School',
      '202f3000-0000-4000-8000-000000000001',
      '202f1000-0000-4000-8000-000000000005',
      '20f30000-0000-4000-8000-000000000001',
      '202fffff-ffff-4fff-8fff-ffffffffffff'
    );
    raise exception 'FAILED: student accepted a nonexistent school.';
  exception
    when sqlstate '23514' then null;
  end;
end
$student_nonexistent_school$;

-- An existing student cannot be moved by changing only school_id.
do $student_school_update_mismatch$
begin
  begin
    update public.students
    set school_id = '20e10000-0000-4000-8000-000000000001'
    where id = '202f8000-0000-4000-8000-000000000001';
    raise exception 'FAILED: student school_id changed without matching roots.';
  exception
    when sqlstate '23514' then null;
  end;
end
$student_school_update_mismatch$;

-- A family identity from School B cannot link to a School A student.
do $parent_student_cross_school$
begin
  begin
    insert into public.parent_students (id, parent_id, student_id)
    values (
      '202fb000-0000-4000-8000-000000000004',
      '202f1000-0000-4000-8000-000000000010',
      '202f8000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: cross-tenant parent-student relation was accepted.';
  exception
    when sqlstate '23514' then null;
  end;
end
$parent_student_cross_school$;

-- Legacy family relations cannot cross tenants.
do $student_family_cross_school$
begin
  begin
    insert into public.student_families (student_id, family_id, relation)
    values (
      '202f8000-0000-4000-8000-000000000001',
      '202f7000-0000-4000-8000-000000000004',
      'invalid-cross-tenant'
    );
    raise exception 'FAILED: cross-tenant legacy family relation was accepted.';
  exception
    when sqlstate '23514' then null;
  end;
end
$student_family_cross_school$;

-- Duplicate parent relations are rejected by the tenant-aware unique index.
do $parent_student_duplicate$
begin
  begin
    insert into public.parent_students (id, parent_id, student_id)
    values (
      '202fb000-0000-4000-8000-000000000005',
      '202f1000-0000-4000-8000-000000000008',
      '202f8000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: duplicate parent-student relation was accepted.';
  exception
    when unique_violation then null;
  end;
end
$parent_student_duplicate$;

-- Course, subject and academic year must all belong to one school.
do $teacher_assignment_cross_roots$
begin
  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      subject_id,
      course_id,
      academic_year_id
    )
    values (
      '202fb000-0000-4000-8000-000000000006',
      '202f1000-0000-4000-8000-000000000004',
      '202f4000-0000-4000-8000-000000000006',
      '202f3000-0000-4000-8000-000000000001',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: cross-tenant teacher assignment was accepted.';
  exception
    when sqlstate '23514' then null;
  end;
end
$teacher_assignment_cross_roots$;

-- An inactive tutor membership cannot authorize a new assignment.
do $teacher_assignment_inactive_membership$
begin
  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      subject_id,
      course_id,
      academic_year_id
    )
    values (
      '202fb000-0000-4000-8000-000000000007',
      '202f1000-0000-4000-8000-000000000007',
      '202f4000-0000-4000-8000-000000000001',
      '202f3000-0000-4000-8000-000000000002',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: inactive tutor membership authorized an assignment.';
  exception
    when sqlstate '23514' then null;
  end;
end
$teacher_assignment_inactive_membership$;

-- A user without membership cannot authorize an assignment.
do $teacher_assignment_without_membership$
begin
  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      subject_id,
      course_id,
      academic_year_id
    )
    values (
      '202fb000-0000-4000-8000-000000000008',
      '202f1000-0000-4000-8000-000000000012',
      '202f4000-0000-4000-8000-000000000001',
      '202f3000-0000-4000-8000-000000000002',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: no-membership user authorized an assignment.';
  exception
    when sqlstate '23514' then null;
  end;
end
$teacher_assignment_without_membership$;

-- A director membership is incompatible with teacher assignments.
do $teacher_assignment_incompatible_role$
begin
  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      subject_id,
      course_id,
      academic_year_id
    )
    values (
      '202fb000-0000-4000-8000-000000000009',
      '202f1000-0000-4000-8000-000000000013',
      '202f4000-0000-4000-8000-000000000001',
      '202f3000-0000-4000-8000-000000000002',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: incompatible role authorized an assignment.';
  exception
    when sqlstate '23514' then null;
  end;
end
$teacher_assignment_incompatible_role$;

-- A legacy people row cannot be written to an inactive center.
do $inactive_school_people_write$
begin
  begin
    insert into public.families (id, name, email, school_id)
    values (
      '202fb000-0000-4000-8000-000000000010',
      '20_2F Negative Inactive Family',
      '20_2f.negative.inactive@example.test',
      '202f0000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: inactive school accepted a people row.';
  exception
    when sqlstate '23514' then null;
  end;
end
$inactive_school_people_write$;

-- Duplicate assignments are rejected independently per school.
do $teacher_assignment_duplicate$
begin
  begin
    insert into public.teacher_assignments (
      id,
      teacher_id,
      subject_id,
      course_id,
      academic_year_id
    )
    values (
      '202fb000-0000-4000-8000-000000000011',
      '202f1000-0000-4000-8000-000000000004',
      '202f4000-0000-4000-8000-000000000003',
      '202f3000-0000-4000-8000-000000000001',
      '20f30000-0000-4000-8000-000000000001'
    );
    raise exception 'FAILED: duplicate teacher assignment was accepted.';
  exception
    when unique_violation then null;
  end;
end
$teacher_assignment_duplicate$;

-- Legacy teachers require an explicit audited school and never infer one from
-- email, profile or the first membership.
do $legacy_teacher_requires_explicit_school$
begin
  begin
    insert into public.teachers (id, name, email, can_be_tutor, school_id)
    values (
      '202fb000-0000-4000-8000-000000000012',
      '20_2F Negative Legacy Teacher',
      '20_2f.negative.legacy.teacher@example.test',
      true,
      null
    );
    raise exception 'FAILED: legacy teacher inferred a school.';
  exception
    when sqlstate '23514' then null;
  end;

  insert into public.teachers (id, name, email, can_be_tutor, school_id)
  values (
    '202fb000-0000-4000-8000-000000000013',
    '20_2F Transactional Legacy Teacher',
    '20_2f.transactional.legacy.teacher@example.test',
    true,
    '20f20000-0000-4000-8000-000000000001'
  );

  if not exists (
    select 1
    from public.teachers
    where id = '202fb000-0000-4000-8000-000000000013'
      and school_id = '20f20000-0000-4000-8000-000000000001'
  ) then
    raise exception 'FAILED: explicitly audited legacy teacher was not accepted.';
  end if;
end
$legacy_teacher_requires_explicit_school$;

-- Deterministic backfill classification. Ambiguous or missing sources are
-- identified before any tenant assignment; no ordering or LIMIT is used.
create temporary table people_20_2f_resolution_candidates (
  entity_id uuid not null,
  school_id uuid not null
) on commit drop;

insert into people_20_2f_resolution_candidates (entity_id, school_id)
values
  ('202fb000-0000-4000-8000-000000000101', '20f20000-0000-4000-8000-000000000001'),
  ('202fb000-0000-4000-8000-000000000102', '20f20000-0000-4000-8000-000000000001'),
  ('202fb000-0000-4000-8000-000000000102', '20e10000-0000-4000-8000-000000000001');

do $deterministic_classification$
declare
  resolved_count integer;
  ambiguous_count integer;
  missing_count integer;
begin
  select count(*)
  into resolved_count
  from (
    select entity_id
    from people_20_2f_resolution_candidates
    group by entity_id
    having count(distinct school_id) = 1
  ) resolved;

  select count(*)
  into ambiguous_count
  from (
    select entity_id
    from people_20_2f_resolution_candidates
    group by entity_id
    having count(distinct school_id) > 1
  ) ambiguous;

  select count(*)
  into missing_count
  from (
    values ('202fb000-0000-4000-8000-000000000103'::uuid)
  ) expected(entity_id)
  left join people_20_2f_resolution_candidates candidate
    on candidate.entity_id = expected.entity_id
  where candidate.entity_id is null;

  if resolved_count <> 1
     or ambiguous_count <> 1
     or missing_count <> 1 then
    raise exception 'FAILED: deterministic source classification changed.';
  end if;
end
$deterministic_classification$;

rollback;

select
  '20_2F negative integrity cases passed and rolled back' as result,
  14 as rejected_or_classified_cases;
