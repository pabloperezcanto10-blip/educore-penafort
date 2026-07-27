-- Sprint 20.2C - tenant-aware academic configuration.
-- Staging-only migration. The preconditions deliberately reject non-empty
-- configuration tables so this cannot backfill real academic data by accident.

begin;

do $preconditions$
begin
  if (
    select count(*)
    from public.schools
    where id in (
      '20e10000-0000-4000-8000-000000000001',
      '20f20000-0000-4000-8000-000000000001'
    )
      and active = true
  ) <> 2 then
    raise exception 'Sprint 20.2C requires the two active staging QA tenants.';
  end if;

  if exists (
    select 1
    from public.schools
    where id not in (
      '20e10000-0000-4000-8000-000000000001',
      '20f20000-0000-4000-8000-000000000001'
    )
  ) then
    raise exception 'Refusing 20.2C: an unauthorized staging tenant exists.';
  end if;

  if exists (
    select 1
    from public.schools
    where slug in ('colegio-educacora', 'educacora')
       or lower(name) = 'colegio educacora'
  ) then
    raise exception 'Refusing 20.2C: Colegio EducaCora must not exist.';
  end if;

  if exists (select 1 from public.academic_years)
     or exists (select 1 from public.courses)
     or exists (select 1 from public.subjects)
     or exists (select 1 from public.course_subjects) then
    raise exception 'Refusing 20.2C: academic configuration is not empty.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'academic_years',
        'courses',
        'subjects',
        'course_subjects'
      )
      and column_name = 'school_id'
  ) then
    raise exception 'Refusing 20.2C: a configuration school_id already exists.';
  end if;

  if to_regclass('public.academic_years_only_one_active_idx') is null then
    raise exception 'Expected global active-year index is missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.academic_years'::regclass
      and conname = 'academic_years_name_key'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.courses'::regclass
      and conname = 'courses_name_key'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.subjects'::regclass
      and conname = 'subjects_name_key'
  ) then
    raise exception 'Expected global configuration name constraints are missing.';
  end if;
end
$preconditions$;

alter table public.academic_years
  add column school_id uuid;
alter table public.courses
  add column school_id uuid;
alter table public.subjects
  add column school_id uuid;
alter table public.course_subjects
  add column school_id uuid;

alter table public.academic_years
  add constraint academic_years_school_id_fkey
  foreign key (school_id) references public.schools(id);
alter table public.courses
  add constraint courses_school_id_fkey
  foreign key (school_id) references public.schools(id);
alter table public.subjects
  add constraint subjects_school_id_fkey
  foreign key (school_id) references public.schools(id);
alter table public.course_subjects
  add constraint course_subjects_school_id_fkey
  foreign key (school_id) references public.schools(id);

alter table public.academic_years alter column school_id set not null;
alter table public.courses alter column school_id set not null;
alter table public.subjects alter column school_id set not null;
alter table public.course_subjects alter column school_id set not null;

create index academic_years_school_id_idx
  on public.academic_years (school_id);
create index courses_school_id_idx
  on public.courses (school_id);
create index subjects_school_id_idx
  on public.subjects (school_id);
create index course_subjects_school_id_idx
  on public.course_subjects (school_id);

create unique index academic_years_id_school_id_uidx
  on public.academic_years (id, school_id);
create unique index courses_id_school_id_uidx
  on public.courses (id, school_id);
create unique index subjects_id_school_id_uidx
  on public.subjects (id, school_id);

create unique index academic_years_school_name_uidx
  on public.academic_years (school_id, name);
create unique index academic_years_one_active_per_school_uidx
  on public.academic_years (school_id)
  where active = true;
create unique index courses_school_year_name_uidx
  on public.courses (school_id, academic_year_id, name);
create unique index subjects_school_name_uidx
  on public.subjects (school_id, name);
create unique index course_subjects_school_unique_uidx
  on public.course_subjects (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    coalesce(track, '')
  );

-- Authorized exception: replace the four global uniqueness objects only after
-- their tenant-scoped equivalents exist in the same transaction.
drop index public.academic_years_only_one_active_idx;
alter table public.academic_years
  drop constraint academic_years_name_key;
alter table public.courses
  drop constraint courses_name_key;
alter table public.subjects
  drop constraint subjects_name_key;

alter table public.courses
  add constraint courses_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id);

alter table public.course_subjects
  add constraint course_subjects_course_school_fkey
  foreign key (course_id, school_id)
  references public.courses (id, school_id);
alter table public.course_subjects
  add constraint course_subjects_subject_school_fkey
  foreign key (subject_id, school_id)
  references public.subjects (id, school_id);
alter table public.course_subjects
  add constraint course_subjects_academic_year_school_fkey
  foreign key (academic_year_id, school_id)
  references public.academic_years (id, school_id);

create or replace function public.active_academic_year_id(p_school_id uuid)
returns uuid
language sql
stable
set search_path = public
as $$
  select academic_year.id
  from public.academic_years academic_year
  where academic_year.school_id = p_school_id
    and academic_year.active = true
  order by academic_year.created_at desc
  limit 1
$$;

create or replace function public.active_academic_year_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select academic_year.id
  from public.academic_years academic_year
  where academic_year.active = true
  order by
    (academic_year.school_id = '20f20000-0000-4000-8000-000000000001') desc,
    academic_year.created_at desc
  limit 1
$$;

create or replace function public.set_default_course_configuration_context()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.school_id is null and new.academic_year_id is not null then
    select academic_year.school_id
    into new.school_id
    from public.academic_years academic_year
    where academic_year.id = new.academic_year_id;
  end if;

  if new.academic_year_id is null and new.school_id is not null then
    new.academic_year_id = public.active_academic_year_id(new.school_id);
  end if;

  if new.school_id is null or new.academic_year_id is null then
    raise exception 'Course requires a school and an active academic year.';
  end if;

  if not exists (
    select 1
    from public.academic_years academic_year
    where academic_year.id = new.academic_year_id
      and academic_year.school_id = new.school_id
  ) then
    raise exception 'Course academic year does not belong to its school.';
  end if;

  return new;
end;
$$;

drop trigger if exists courses_default_academic_year on public.courses;
create trigger courses_default_academic_year
before insert or update of school_id, academic_year_id on public.courses
for each row execute function public.set_default_course_configuration_context();

create or replace function public.is_active_school_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = auth.uid()
      and membership.school_id = p_school_id
      and membership.active = true
      and school.active = true
  )
$$;

create or replace function public.has_school_role(
  p_school_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = auth.uid()
      and membership.school_id = p_school_id
      and membership.role = any(p_roles)
      and membership.active = true
      and school.active = true
  )
$$;

create or replace function public.can_manage_school_configuration(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.current_user_has_role('superadmin')
    and exists (
      select 1
      from public.schools school
      where school.id = p_school_id
        and school.active = true
    )
$$;

revoke all on function public.is_active_school_member(uuid) from public;
revoke all on function public.has_school_role(uuid, public.app_role[]) from public;
revoke all on function public.can_manage_school_configuration(uuid) from public;
grant execute on function public.is_active_school_member(uuid) to authenticated;
grant execute on function public.has_school_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.can_manage_school_configuration(uuid) to authenticated;

alter policy "academic_years_superadmin_all"
on public.academic_years
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "academic_years_director_select"
on public.academic_years
using (public.has_school_role(school_id, array['director']::public.app_role[]));

alter policy "academic_years_active_select"
on public.academic_years
using (
  active = true
  and public.has_school_role(
    school_id,
    array['tutor', 'family']::public.app_role[]
  )
);

alter policy "courses_authenticated_select_all"
on public.courses
using (
  public.current_user_has_role('superadmin')
  or public.is_active_school_member(school_id)
);

alter policy "courses_director_select_all"
on public.courses
using (public.has_school_role(school_id, array['director']::public.app_role[]));

alter policy "courses_superadmin_insert_all"
on public.courses
with check (public.can_manage_school_configuration(school_id));

alter policy "courses_superadmin_update_all"
on public.courses
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "subjects_authenticated_select_all"
on public.subjects
using (
  public.current_user_has_role('superadmin')
  or public.is_active_school_member(school_id)
);

alter policy "subjects_superadmin_insert_all"
on public.subjects
with check (public.can_manage_school_configuration(school_id));

alter policy "subjects_superadmin_update_all"
on public.subjects
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "course_subjects_authenticated_select"
on public.course_subjects
using (
  public.current_user_has_role('superadmin')
  or public.is_active_school_member(school_id)
);

alter policy "course_subjects_superadmin_insert"
on public.course_subjects
with check (public.can_manage_school_configuration(school_id));

alter policy "course_subjects_superadmin_update"
on public.course_subjects
using (public.can_manage_school_configuration(school_id))
with check (public.can_manage_school_configuration(school_id));

alter policy "course_subjects_superadmin_delete"
on public.course_subjects
using (public.can_manage_school_configuration(school_id));

insert into public.academic_years (
  id,
  school_id,
  name,
  start_date,
  end_date,
  active
)
values
  (
    '20e20000-0000-4000-8000-000000000001',
    '20e10000-0000-4000-8000-000000000001',
    'QA School 2026-2027',
    '2026-09-01',
    '2027-06-30',
    true
  ),
  (
    '20f30000-0000-4000-8000-000000000001',
    '20f20000-0000-4000-8000-000000000001',
    'QA Penafort 2026-2027',
    '2026-09-01',
    '2027-06-30',
    true
  );

insert into public.courses (
  id,
  school_id,
  name,
  academic_year_id
)
values
  (
    '20e20000-0000-4000-8000-000000000101',
    '20e10000-0000-4000-8000-000000000001',
    'Curso QA School',
    '20e20000-0000-4000-8000-000000000001'
  ),
  (
    '20f30000-0000-4000-8000-000000000101',
    '20f20000-0000-4000-8000-000000000001',
    'Curso QA Penafort',
    '20f30000-0000-4000-8000-000000000001'
  );

insert into public.subjects (id, school_id, name)
values
  (
    '20e20000-0000-4000-8000-000000000201',
    '20e10000-0000-4000-8000-000000000001',
    'Ciencias QA School'
  ),
  (
    '20f30000-0000-4000-8000-000000000201',
    '20f20000-0000-4000-8000-000000000001',
    'Lengua QA Penafort'
  ),
  (
    '20f30000-0000-4000-8000-000000000202',
    '20f20000-0000-4000-8000-000000000001',
    'Matematicas QA Penafort'
  );

insert into public.course_subjects (
  id,
  school_id,
  course_id,
  subject_id,
  academic_year_id,
  optional,
  track
)
values
  (
    '20e20000-0000-4000-8000-000000000301',
    '20e10000-0000-4000-8000-000000000001',
    '20e20000-0000-4000-8000-000000000101',
    '20e20000-0000-4000-8000-000000000201',
    '20e20000-0000-4000-8000-000000000001',
    false,
    null
  ),
  (
    '20f30000-0000-4000-8000-000000000301',
    '20f20000-0000-4000-8000-000000000001',
    '20f30000-0000-4000-8000-000000000101',
    '20f30000-0000-4000-8000-000000000201',
    '20f30000-0000-4000-8000-000000000001',
    false,
    null
  ),
  (
    '20f30000-0000-4000-8000-000000000302',
    '20f20000-0000-4000-8000-000000000001',
    '20f30000-0000-4000-8000-000000000101',
    '20f30000-0000-4000-8000-000000000202',
    '20f30000-0000-4000-8000-000000000001',
    false,
    null
  );

do $postconditions$
begin
  if (select count(*) from public.academic_years) <> 2
     or (select count(*) from public.courses) <> 2
     or (select count(*) from public.subjects) <> 3
     or (select count(*) from public.course_subjects) <> 3 then
    raise exception '20.2C created an unexpected fixture count.';
  end if;

  if exists (
    select 1
    from public.academic_years
    where school_id is null
  ) or exists (
    select 1
    from public.courses
    where school_id is null
  ) or exists (
    select 1
    from public.subjects
    where school_id is null
  ) or exists (
    select 1
    from public.course_subjects
    where school_id is null
  ) then
    raise exception '20.2C left configuration without a school.';
  end if;

  if exists (
    select 1
    from public.courses course
    join public.academic_years academic_year
      on academic_year.id = course.academic_year_id
    where course.school_id is distinct from academic_year.school_id
  ) or exists (
    select 1
    from public.course_subjects relation
    join public.courses course on course.id = relation.course_id
    join public.subjects subject on subject.id = relation.subject_id
    left join public.academic_years academic_year
      on academic_year.id = relation.academic_year_id
    where relation.school_id is distinct from course.school_id
       or relation.school_id is distinct from subject.school_id
       or (
         relation.academic_year_id is not null
         and relation.school_id is distinct from academic_year.school_id
       )
  ) then
    raise exception '20.2C created a cross-school configuration relationship.';
  end if;

  if public.active_academic_year_id(
    '20e10000-0000-4000-8000-000000000001'
  ) <> '20e20000-0000-4000-8000-000000000001'
     or public.active_academic_year_id(
       '20f20000-0000-4000-8000-000000000001'
     ) <> '20f30000-0000-4000-8000-000000000001' then
    raise exception 'Tenant-aware active academic year resolution failed.';
  end if;

  if public.active_academic_year_id()
     <> '20f30000-0000-4000-8000-000000000001' then
    raise exception 'Legacy active academic year compatibility failed.';
  end if;
end
$postconditions$;

commit;
