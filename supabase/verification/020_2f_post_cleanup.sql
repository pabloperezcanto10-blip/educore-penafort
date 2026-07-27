-- SPRINT 20.2F - STAGING ONLY
-- Read-only proof that no fixture from this sprint remains.

begin transaction read only;

do $zero_residue$
begin
  if exists (
    select 1
    from auth.users
    where email like '20_2f.%@example.test'
       or id between
         '202f1000-0000-4000-8000-000000000001'::uuid
         and '202f1000-0000-4000-8000-000000000013'::uuid
  ) then
    raise exception 'Residual 20_2F auth user detected.';
  end if;

  if exists (
    select 1
    from auth.identities
    where user_id between
      '202f1000-0000-4000-8000-000000000001'::uuid
      and '202f1000-0000-4000-8000-000000000013'::uuid
  ) then
    raise exception 'Residual 20_2F auth identity detected.';
  end if;

  if exists (
    select 1
    from public.profiles
    where id between
      '202f1000-0000-4000-8000-000000000001'::uuid
      and '202f1000-0000-4000-8000-000000000013'::uuid
  ) then
    raise exception 'Residual 20_2F profile detected.';
  end if;

  if exists (
    select 1
    from public.school_memberships
    where id between
      '202f1100-0000-4000-8000-000000000001'::uuid
      and '202f1100-0000-4000-8000-000000000015'::uuid
       or user_id between
         '202f1000-0000-4000-8000-000000000001'::uuid
         and '202f1000-0000-4000-8000-000000000013'::uuid
  ) then
    raise exception 'Residual 20_2F membership detected.';
  end if;

  if exists (
    select 1
    from public.students
    where id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
       or name like '20_2F%'
  ) then
    raise exception 'Residual 20_2F student detected.';
  end if;

  if exists (
    select 1
    from public.families
    where id between
      '202f7000-0000-4000-8000-000000000001'::uuid
      and '202f7000-0000-4000-8000-000000000005'::uuid
       or name like '20_2F%'
       or email like '20_2f.%@example.test'
  ) then
    raise exception 'Residual 20_2F legacy family detected.';
  end if;

  if exists (
    select 1
    from public.student_families
    where student_id between
      '202f8000-0000-4000-8000-000000000001'::uuid
      and '202f8000-0000-4000-8000-000000000010'::uuid
       or family_id between
         '202f7000-0000-4000-8000-000000000001'::uuid
         and '202f7000-0000-4000-8000-000000000005'::uuid
  ) then
    raise exception 'Residual 20_2F legacy student-family relation detected.';
  end if;

  if exists (
    select 1
    from public.parent_students
    where id between
      '202f9000-0000-4000-8000-000000000001'::uuid
      and '202f9000-0000-4000-8000-000000000006'::uuid
       or parent_id between
         '202f1000-0000-4000-8000-000000000001'::uuid
         and '202f1000-0000-4000-8000-000000000013'::uuid
       or student_id between
         '202f8000-0000-4000-8000-000000000001'::uuid
         and '202f8000-0000-4000-8000-000000000010'::uuid
  ) then
    raise exception 'Residual 20_2F parent relation detected.';
  end if;

  if exists (
    select 1
    from public.teachers
    where id between
      '202f6000-0000-4000-8000-000000000001'::uuid
      and '202f6000-0000-4000-8000-000000000004'::uuid
       or name like '20_2F%'
       or email like '20_2f.%@example.test'
  ) then
    raise exception 'Residual 20_2F legacy teacher detected.';
  end if;

  if exists (
    select 1
    from public.teacher_assignments
    where id between
      '202fa000-0000-4000-8000-000000000001'::uuid
      and '202fa000-0000-4000-8000-000000000007'::uuid
       or teacher_id between
         '202f1000-0000-4000-8000-000000000001'::uuid
         and '202f1000-0000-4000-8000-000000000013'::uuid
  ) then
    raise exception 'Residual 20_2F teacher assignment detected.';
  end if;

  if exists (
    select 1
    from public.academic_years
    where id in (
      '202f2000-0000-4000-8000-000000000001',
      '202f2000-0000-4000-8000-000000000002'
    )
       or name like '20_2F%'
  ) then
    raise exception 'Residual 20_2F academic year detected.';
  end if;

  if exists (
    select 1
    from public.courses
    where id between
      '202f3000-0000-4000-8000-000000000001'::uuid
      and '202f3000-0000-4000-8000-000000000004'::uuid
       or name like '20_2F%'
  ) then
    raise exception 'Residual 20_2F course detected.';
  end if;

  if exists (
    select 1
    from public.subjects
    where id between
      '202f4000-0000-4000-8000-000000000001'::uuid
      and '202f4000-0000-4000-8000-000000000006'::uuid
       or name like '20_2F%'
  ) then
    raise exception 'Residual 20_2F subject detected.';
  end if;

  if exists (
    select 1
    from public.course_subjects
    where id between
      '202f5000-0000-4000-8000-000000000001'::uuid
      and '202f5000-0000-4000-8000-000000000008'::uuid
  ) then
    raise exception 'Residual 20_2F course-subject relation detected.';
  end if;

  if exists (
    select 1
    from public.schools
    where id = '202f0000-0000-4000-8000-000000000001'
       or slug = '20-2f-inactive-school'
  ) then
    raise exception 'Residual 20_2F inactive school detected.';
  end if;

  if (
    select count(*)
    from public.schools
    where (id, slug, active) in (
      (
        '20e10000-0000-4000-8000-000000000001'::uuid,
        'qa-school',
        true
      ),
      (
        '20f20000-0000-4000-8000-000000000001'::uuid,
        'colegio-penafort',
        true
      )
    )
  ) <> 2 then
    raise exception 'Existing QA schools changed during 20.2F cleanup.';
  end if;
end
$zero_residue$;

rollback;

select
  '20_2F post-cleanup passed' as result,
  0 as auth_users,
  0 as profiles,
  0 as memberships,
  0 as students,
  0 as families,
  0 as student_families,
  0 as parent_students,
  0 as teachers,
  0 as teacher_assignments,
  0 as academic_years,
  0 as courses,
  0 as subjects,
  0 as course_subjects,
  0 as residual_relations;
