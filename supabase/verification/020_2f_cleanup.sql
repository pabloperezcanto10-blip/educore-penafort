-- SPRINT 20.2F - STAGING ONLY
-- Idempotent cleanup for fixtures created by this sprint.
-- Every predicate is restricted to the explicit 20_2F identifiers.

begin;

do $staging_guard$
begin
  if not exists (
    select 1
    from public.schools
    where id = '20e10000-0000-4000-8000-000000000001'
      and slug = 'qa-school'
  ) then
    raise exception 'STAGING GUARD: QA School is missing.';
  end if;
end
$staging_guard$;

-- Invalidate temporary login credentials before removing the identities.
update auth.users
set
  encrypted_password = '',
  updated_at = now()
where id between
  '202f1000-0000-4000-8000-000000000001'::uuid
  and '202f1000-0000-4000-8000-000000000013'::uuid
  and email like '20_2f.%@example.test';

delete from public.teacher_assignments
where id between
  '202fa000-0000-4000-8000-000000000001'::uuid
  and '202fa000-0000-4000-8000-000000000007'::uuid;

delete from public.parent_students
where id between
  '202f9000-0000-4000-8000-000000000001'::uuid
  and '202f9000-0000-4000-8000-000000000006'::uuid;

delete from public.student_families
where student_id between
  '202f8000-0000-4000-8000-000000000001'::uuid
  and '202f8000-0000-4000-8000-000000000010'::uuid
  and family_id between
    '202f7000-0000-4000-8000-000000000001'::uuid
    and '202f7000-0000-4000-8000-000000000005'::uuid;

delete from public.students
where id between
  '202f8000-0000-4000-8000-000000000001'::uuid
  and '202f8000-0000-4000-8000-000000000010'::uuid;

delete from public.families
where id between
  '202f7000-0000-4000-8000-000000000001'::uuid
  and '202f7000-0000-4000-8000-000000000005'::uuid;

delete from public.teachers
where id between
  '202f6000-0000-4000-8000-000000000001'::uuid
  and '202f6000-0000-4000-8000-000000000004'::uuid;

delete from public.course_subjects
where id between
  '202f5000-0000-4000-8000-000000000001'::uuid
  and '202f5000-0000-4000-8000-000000000008'::uuid;

delete from public.courses
where id between
  '202f3000-0000-4000-8000-000000000001'::uuid
  and '202f3000-0000-4000-8000-000000000004'::uuid;

delete from public.subjects
where id between
  '202f4000-0000-4000-8000-000000000001'::uuid
  and '202f4000-0000-4000-8000-000000000006'::uuid;

delete from public.academic_years
where id in (
  '202f2000-0000-4000-8000-000000000001',
  '202f2000-0000-4000-8000-000000000002'
);

delete from public.school_memberships
where id between
  '202f1100-0000-4000-8000-000000000001'::uuid
  and '202f1100-0000-4000-8000-000000000015'::uuid;

delete from auth.identities
where user_id between
  '202f1000-0000-4000-8000-000000000001'::uuid
  and '202f1000-0000-4000-8000-000000000013'::uuid;

delete from public.profiles
where id between
  '202f1000-0000-4000-8000-000000000001'::uuid
  and '202f1000-0000-4000-8000-000000000013'::uuid;

delete from auth.users
where id between
  '202f1000-0000-4000-8000-000000000001'::uuid
  and '202f1000-0000-4000-8000-000000000013'::uuid
  and email like '20_2f.%@example.test';

delete from public.schools
where id = '202f0000-0000-4000-8000-000000000001'
  and slug = '20-2f-inactive-school';

commit;

select '20_2F scoped cleanup completed' as result;
