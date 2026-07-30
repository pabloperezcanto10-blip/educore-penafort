-- SPRINT 20.2J / 039B
-- Tenant-aware authorization for the academic operations prepared by 039A.
-- This migration changes authorization only: no academic rows are modified.

begin;

do $preconditions$
declare
  target_tables constant text[] := array[
    'annual_evaluation_weights',
    'evaluation_criteria',
    'evaluation_publications',
    'final_course_grades',
    'final_evaluation_publications',
    'partial_grades',
    'quarter_final_grades',
    'term_subject_grades'
  ];
  expected_legacy_policies constant text[] := array[
    'annual_weights_supervision_select',
    'annual_weights_teacher_all_assigned',
    'evaluation_criteria_director_select_all',
    'evaluation_criteria_superadmin_select_all',
    'evaluation_criteria_teacher_delete_own',
    'evaluation_criteria_teacher_insert_own',
    'evaluation_criteria_teacher_select_own',
    'evaluation_criteria_teacher_update_own',
    'evaluation_publications_director_insert',
    'evaluation_publications_director_select',
    'evaluation_publications_director_update',
    'evaluation_publications_family_select_published',
    'evaluation_publications_superadmin_insert',
    'evaluation_publications_superadmin_select',
    'evaluation_publications_superadmin_update',
    'evaluation_publications_tutor_select',
    'final_course_grades_family_published_select',
    'final_course_grades_supervision_select',
    'final_course_grades_teacher_all_assigned',
    'final_publications_read_scoped',
    'final_publications_supervision_all',
    'partial_grades_director_select_all',
    'partial_grades_family_select_children_visible',
    'partial_grades_superadmin_select_all',
    'partial_grades_teacher_insert_assigned',
    'partial_grades_teacher_select_assigned',
    'partial_grades_teacher_update_assigned',
    'quarter_final_grades_director_select_all',
    'quarter_final_grades_superadmin_select_all',
    'quarter_final_grades_teacher_insert_own',
    'quarter_final_grades_teacher_select_own',
    'quarter_final_grades_teacher_update_own',
    'term_subject_grades_director_select_all',
    'term_subject_grades_family_select_published',
    'term_subject_grades_superadmin_select_all',
    'term_subject_grades_teacher_insert_assigned',
    'term_subject_grades_teacher_select_assigned',
    'term_subject_grades_teacher_update_assigned'
  ];
  actual_policies text[];
begin
  if (
    select count(*)
    from unnest(target_tables) as target(table_name)
    where to_regclass(format('public.%I', target.table_name)) is not null
  ) <> 8 then
    raise exception 'Refusing 040: one or more 039A academic tables are missing.';
  end if;

  if (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(target_tables)
      and relation.relrowsecurity
  ) <> 8 then
    raise exception 'Refusing 040: RLS is not enabled on all academic tables.';
  end if;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(target_tables)
      and column_name = 'school_id'
      and is_nullable = 'NO'
  ) <> 8 then
    raise exception 'Refusing 040: the 039A school scope is incomplete.';
  end if;

  select array_agg(policyname order by policyname)
  into actual_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = any(target_tables);

  if actual_policies is distinct from expected_legacy_policies then
    raise exception 'Refusing 040: the legacy academic RLS inventory is not the audited 38-policy baseline.';
  end if;
end
$preconditions$;

create or replace function public.academic_school_is_active(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select auth.uid() is not null
    and p_school_id is not null
    and exists (
      select 1
      from public.schools school
      where school.id = p_school_id
        and school.active = true
    )
$function$;

create or replace function public.academic_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'superadmin'
        and profile.active = true
    )
$function$;

create or replace function public.academic_is_director(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.school_memberships membership
      join public.schools school
        on school.id = membership.school_id
       and school.active = true
      join public.profiles profile
        on profile.id = membership.user_id
       and profile.active = true
      where membership.user_id = auth.uid()
        and membership.school_id = p_school_id
        and membership.role = 'director'
        and membership.active = true
    )
$function$;

create or replace function public.academic_is_tutor(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.school_memberships membership
      join public.schools school
        on school.id = membership.school_id
       and school.active = true
      join public.profiles profile
        on profile.id = membership.user_id
       and profile.active = true
      where membership.user_id = auth.uid()
        and membership.school_id = p_school_id
        and membership.role = 'tutor'
        and membership.active = true
    )
$function$;

create or replace function public.academic_is_family(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.school_memberships membership
      join public.schools school
        on school.id = membership.school_id
       and school.active = true
      join public.profiles profile
        on profile.id = membership.user_id
       and profile.active = true
      where membership.user_id = auth.uid()
        and membership.school_id = p_school_id
        and membership.role = 'family'
        and membership.active = true
    )
$function$;

create or replace function public.academic_can_read_student_result(
  p_school_id uuid,
  p_student_id uuid,
  p_teacher_id uuid,
  p_course_id uuid,
  p_subject_id uuid,
  p_academic_year_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select exists (
    select 1
    from public.students student
    join public.courses course
      on course.id = p_course_id
     and course.school_id = p_school_id
     and course.academic_year_id = p_academic_year_id
    join public.subjects subject
      on subject.id = p_subject_id
     and subject.school_id = p_school_id
    join public.academic_years academic_year
      on academic_year.id = p_academic_year_id
     and academic_year.school_id = p_school_id
    join public.schools school
      on school.id = p_school_id
     and school.active = true
    where student.id = p_student_id
      and student.school_id = p_school_id
      and student.course_id = p_course_id
      and student.academic_year_id = p_academic_year_id
      and (
        public.academic_is_superadmin()
        or public.academic_is_director(p_school_id)
        or (
          public.academic_is_tutor(p_school_id)
          and (
            student.tutor_teacher_id = auth.uid()
            or (
              p_teacher_id = auth.uid()
              and exists (
                select 1
                from public.teacher_assignments assignment
                where assignment.school_id = p_school_id
                  and assignment.teacher_id = auth.uid()
                  and assignment.course_id = p_course_id
                  and assignment.subject_id = p_subject_id
                  and assignment.academic_year_id = p_academic_year_id
              )
            )
          )
        )
      )
  )
$function$;

create or replace function public.academic_can_write_student_result(
  p_school_id uuid,
  p_student_id uuid,
  p_teacher_id uuid,
  p_course_id uuid,
  p_subject_id uuid,
  p_academic_year_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select exists (
    select 1
    from public.students student
    join public.courses course
      on course.id = p_course_id
     and course.school_id = p_school_id
     and course.academic_year_id = p_academic_year_id
    join public.subjects subject
      on subject.id = p_subject_id
     and subject.school_id = p_school_id
    join public.academic_years academic_year
      on academic_year.id = p_academic_year_id
     and academic_year.school_id = p_school_id
    join public.schools school
      on school.id = p_school_id
     and school.active = true
    where student.id = p_student_id
      and student.school_id = p_school_id
      and student.course_id = p_course_id
      and student.academic_year_id = p_academic_year_id
      and (
        public.academic_is_superadmin()
        or (
          p_teacher_id = auth.uid()
          and public.academic_is_tutor(p_school_id)
          and exists (
            select 1
            from public.teacher_assignments assignment
            where assignment.school_id = p_school_id
              and assignment.teacher_id = auth.uid()
              and assignment.course_id = p_course_id
              and assignment.subject_id = p_subject_id
              and assignment.academic_year_id = p_academic_year_id
          )
        )
      )
  )
$function$;

create or replace function public.academic_can_read_course_subject(
  p_school_id uuid,
  p_teacher_id uuid,
  p_course_id uuid,
  p_subject_id uuid,
  p_academic_year_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select exists (
    select 1
    from public.courses course
    join public.subjects subject
      on subject.id = p_subject_id
     and subject.school_id = p_school_id
    join public.academic_years academic_year
      on academic_year.id = p_academic_year_id
     and academic_year.school_id = p_school_id
    join public.course_subjects relation
      on relation.school_id = p_school_id
     and relation.course_id = p_course_id
     and relation.subject_id = p_subject_id
     and relation.academic_year_id = p_academic_year_id
    join public.schools school
      on school.id = p_school_id
     and school.active = true
    where course.id = p_course_id
      and course.school_id = p_school_id
      and course.academic_year_id = p_academic_year_id
      and (
        public.academic_is_superadmin()
        or public.academic_is_director(p_school_id)
        or (
          public.academic_is_tutor(p_school_id)
          and (
            (
              p_teacher_id = auth.uid()
              and exists (
                select 1
                from public.teacher_assignments assignment
                where assignment.school_id = p_school_id
                  and assignment.teacher_id = auth.uid()
                  and assignment.course_id = p_course_id
                  and assignment.subject_id = p_subject_id
                  and assignment.academic_year_id = p_academic_year_id
              )
            )
            or exists (
              select 1
              from public.students student
              where student.school_id = p_school_id
                and student.course_id = p_course_id
                and student.academic_year_id = p_academic_year_id
                and student.tutor_teacher_id = auth.uid()
            )
          )
        )
      )
  )
$function$;

create or replace function public.academic_can_write_course_subject(
  p_school_id uuid,
  p_teacher_id uuid,
  p_course_id uuid,
  p_subject_id uuid,
  p_academic_year_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select exists (
    select 1
    from public.courses course
    join public.subjects subject
      on subject.id = p_subject_id
     and subject.school_id = p_school_id
    join public.academic_years academic_year
      on academic_year.id = p_academic_year_id
     and academic_year.school_id = p_school_id
    join public.course_subjects relation
      on relation.school_id = p_school_id
     and relation.course_id = p_course_id
     and relation.subject_id = p_subject_id
     and relation.academic_year_id = p_academic_year_id
    join public.schools school
      on school.id = p_school_id
     and school.active = true
    where course.id = p_course_id
      and course.school_id = p_school_id
      and course.academic_year_id = p_academic_year_id
      and (
        public.academic_is_superadmin()
        or (
          p_teacher_id = auth.uid()
          and public.academic_is_tutor(p_school_id)
          and exists (
            select 1
            from public.teacher_assignments assignment
            where assignment.school_id = p_school_id
              and assignment.teacher_id = auth.uid()
              and assignment.course_id = p_course_id
              and assignment.subject_id = p_subject_id
              and assignment.academic_year_id = p_academic_year_id
          )
        )
      )
  )
$function$;

create or replace function public.academic_can_read_course(
  p_school_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select exists (
    select 1
    from public.courses course
    join public.academic_years academic_year
      on academic_year.id = p_academic_year_id
     and academic_year.school_id = p_school_id
    join public.schools school
      on school.id = p_school_id
     and school.active = true
    where course.id = p_course_id
      and course.school_id = p_school_id
      and course.academic_year_id = p_academic_year_id
      and (
        public.academic_is_superadmin()
        or public.academic_is_director(p_school_id)
        or (
          public.academic_is_tutor(p_school_id)
          and (
            exists (
              select 1
              from public.teacher_assignments assignment
              where assignment.school_id = p_school_id
                and assignment.teacher_id = auth.uid()
                and assignment.course_id = p_course_id
                and assignment.academic_year_id = p_academic_year_id
            )
            or exists (
              select 1
              from public.students student
              where student.school_id = p_school_id
                and student.course_id = p_course_id
                and student.academic_year_id = p_academic_year_id
                and student.tutor_teacher_id = auth.uid()
            )
          )
        )
      )
  )
$function$;

create or replace function public.academic_can_manage_publication(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select public.academic_school_is_active(p_school_id)
    and (
      public.academic_is_superadmin()
      or public.academic_is_director(p_school_id)
    )
$function$;

create or replace function public.academic_is_valid_publication_actor(
  p_school_id uuid,
  p_published boolean,
  p_published_by uuid,
  p_published_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    case
      when p_published then
        p_published_by is not null
        and p_published_at is not null
        and exists (
          select 1
          from public.profiles profile
          where profile.id = p_published_by
            and profile.active = true
            and (
              profile.role = 'superadmin'
              or exists (
                select 1
                from public.school_memberships membership
                join public.schools school
                  on school.id = membership.school_id
                 and school.active = true
                where membership.user_id = profile.id
                  and membership.school_id = p_school_id
                  and membership.role in ('director', 'superadmin')
                  and membership.active = true
              )
            )
        )
      else
        p_published_by is null
        or exists (
          select 1
          from public.profiles profile
          where profile.id = p_published_by
            and profile.active = true
            and (
              profile.role = 'superadmin'
              or exists (
                select 1
                from public.school_memberships membership
                where membership.user_id = profile.id
                  and membership.school_id = p_school_id
                  and membership.role in ('director', 'superadmin')
                  and membership.active = true
              )
            )
        )
    end
$function$;

create or replace function public.academic_family_can_read_partial(
  p_school_id uuid,
  p_student_id uuid,
  p_visible_to_family boolean
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select p_visible_to_family
    and public.academic_is_family(p_school_id)
    and exists (
      select 1
      from public.parent_students relation
      join public.students student
        on student.id = relation.student_id
       and student.school_id = relation.school_id
      where relation.parent_id = auth.uid()
        and relation.student_id = p_student_id
        and relation.school_id = p_school_id
    )
$function$;

create or replace function public.academic_family_can_read_term(
  p_school_id uuid,
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid,
  p_term text,
  p_status text
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select p_status = 'closed'
    and public.academic_is_family(p_school_id)
    and exists (
      select 1
      from public.parent_students relation
      join public.students student
        on student.id = relation.student_id
       and student.school_id = relation.school_id
      where relation.parent_id = auth.uid()
        and relation.student_id = p_student_id
        and relation.school_id = p_school_id
        and student.course_id = p_course_id
        and student.academic_year_id = p_academic_year_id
    )
    and exists (
      select 1
      from public.evaluation_publications publication
      where publication.school_id = p_school_id
        and publication.course_id = p_course_id
        and publication.academic_year_id = p_academic_year_id
        and publication.term = p_term
        and publication.published = true
    )
$function$;

create or replace function public.academic_family_can_read_final(
  p_school_id uuid,
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid,
  p_status text
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select p_status = 'closed'
    and public.academic_is_family(p_school_id)
    and exists (
      select 1
      from public.parent_students relation
      join public.students student
        on student.id = relation.student_id
       and student.school_id = relation.school_id
      where relation.parent_id = auth.uid()
        and relation.student_id = p_student_id
        and relation.school_id = p_school_id
        and student.course_id = p_course_id
        and student.academic_year_id = p_academic_year_id
    )
    and exists (
      select 1
      from public.final_evaluation_publications publication
      where publication.school_id = p_school_id
        and publication.course_id = p_course_id
        and publication.academic_year_id = p_academic_year_id
        and publication.published = true
    )
$function$;

create or replace function public.academic_family_can_read_publication(
  p_school_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid,
  p_published boolean
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select p_published
    and public.academic_is_family(p_school_id)
    and exists (
      select 1
      from public.parent_students relation
      join public.students student
        on student.id = relation.student_id
       and student.school_id = relation.school_id
      where relation.parent_id = auth.uid()
        and relation.school_id = p_school_id
        and student.course_id = p_course_id
        and student.academic_year_id = p_academic_year_id
    )
$function$;

comment on function public.academic_school_is_active(uuid)
  is '039B: confirms that an explicitly supplied school is active.';
comment on function public.academic_is_superadmin()
  is '039B: global superadmin check; the only academic helper allowed to use profiles.role without a membership.';
comment on function public.academic_is_director(uuid)
  is '039B: active director membership in an active explicit school.';
comment on function public.academic_is_tutor(uuid)
  is '039B: active tutor membership in an active explicit school.';
comment on function public.academic_is_family(uuid)
  is '039B: active family membership in an active explicit school.';
comment on function public.academic_can_read_student_result(uuid, uuid, uuid, uuid, uuid, uuid)
  is '039B: read authorization for a structurally coherent student result.';
comment on function public.academic_can_write_student_result(uuid, uuid, uuid, uuid, uuid, uuid)
  is '039B: write authorization for superadmin or the exact assigned teacher.';
comment on function public.academic_can_read_course_subject(uuid, uuid, uuid, uuid, uuid)
  is '039B: read authorization for a course-subject context, including direct tutors.';
comment on function public.academic_can_write_course_subject(uuid, uuid, uuid, uuid, uuid)
  is '039B: write authorization for superadmin or the exact assigned teacher.';
comment on function public.academic_can_read_course(uuid, uuid, uuid)
  is '039B: read authorization for course-level publications.';
comment on function public.academic_can_manage_publication(uuid)
  is '039B: publication management for global superadmin or the school director.';
comment on function public.academic_is_valid_publication_actor(uuid, boolean, uuid, timestamptz)
  is '039B: validates publication metadata without inferring a default school.';
comment on function public.academic_family_can_read_partial(uuid, uuid, boolean)
  is '039B: family partial-grade visibility preserves the current visible_to_family contract.';
comment on function public.academic_family_can_read_term(uuid, uuid, uuid, uuid, text, text)
  is '039B: family term-grade visibility requires a closed row and an exact published evaluation.';
comment on function public.academic_family_can_read_final(uuid, uuid, uuid, uuid, text)
  is '039B: family final-grade visibility requires a closed row and an exact final publication.';
comment on function public.academic_family_can_read_publication(uuid, uuid, uuid, boolean)
  is '039B: minimal family read access to published rows for a related student course.';

-- Remove the audited monotenant policies. Preconditions above prevent this
-- block from acting on an unexpected policy inventory.
do $drop_legacy_policies$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'partial_grades',
        'evaluation_criteria',
        'quarter_final_grades',
        'term_subject_grades',
        'evaluation_publications',
        'annual_evaluation_weights',
        'final_course_grades',
        'final_evaluation_publications'
      )
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$drop_legacy_policies$;

-- partial_grades
create policy partial_grades_internal_select
on public.partial_grades
for select
to authenticated
using (
  public.academic_can_read_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy partial_grades_family_select
on public.partial_grades
for select
to authenticated
using (
  public.academic_family_can_read_partial(
    school_id, student_id, visible_to_family
  )
);

create policy partial_grades_internal_insert
on public.partial_grades
for insert
to authenticated
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy partial_grades_internal_update
on public.partial_grades
for update
to authenticated
using (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
)
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy partial_grades_superadmin_delete
on public.partial_grades
for delete
to authenticated
using (
  public.academic_is_superadmin()
  and public.academic_school_is_active(school_id)
);

-- evaluation_criteria
create policy evaluation_criteria_internal_select
on public.evaluation_criteria
for select
to authenticated
using (
  public.academic_can_read_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy evaluation_criteria_internal_insert
on public.evaluation_criteria
for insert
to authenticated
with check (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy evaluation_criteria_internal_update
on public.evaluation_criteria
for update
to authenticated
using (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
)
with check (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy evaluation_criteria_internal_delete
on public.evaluation_criteria
for delete
to authenticated
using (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

-- quarter_final_grades
-- Family does not receive direct access: teacher_observation is not a
-- family-facing field in the current product. Official family results come
-- from closed and published term_subject_grades.
create policy quarter_final_grades_internal_select
on public.quarter_final_grades
for select
to authenticated
using (
  public.academic_can_read_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy quarter_final_grades_internal_insert
on public.quarter_final_grades
for insert
to authenticated
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy quarter_final_grades_internal_update
on public.quarter_final_grades
for update
to authenticated
using (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
)
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy quarter_final_grades_superadmin_delete
on public.quarter_final_grades
for delete
to authenticated
using (
  public.academic_is_superadmin()
  and public.academic_school_is_active(school_id)
);

-- term_subject_grades
create policy term_subject_grades_internal_select
on public.term_subject_grades
for select
to authenticated
using (
  public.academic_can_read_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy term_subject_grades_family_select
on public.term_subject_grades
for select
to authenticated
using (
  public.academic_family_can_read_term(
    school_id, student_id, course_id, academic_year_id, term, status
  )
);

create policy term_subject_grades_internal_insert
on public.term_subject_grades
for insert
to authenticated
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy term_subject_grades_internal_update
on public.term_subject_grades
for update
to authenticated
using (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
)
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy term_subject_grades_superadmin_delete
on public.term_subject_grades
for delete
to authenticated
using (
  public.academic_is_superadmin()
  and public.academic_school_is_active(school_id)
);

-- evaluation_publications
create policy evaluation_publications_internal_select
on public.evaluation_publications
for select
to authenticated
using (
  public.academic_can_read_course(
    school_id, course_id, academic_year_id
  )
);

create policy evaluation_publications_family_select
on public.evaluation_publications
for select
to authenticated
using (
  public.academic_family_can_read_publication(
    school_id, course_id, academic_year_id, published
  )
);

create policy evaluation_publications_management_insert
on public.evaluation_publications
for insert
to authenticated
with check (
  public.academic_can_manage_publication(school_id)
  and public.academic_is_valid_publication_actor(
    school_id, published, published_by, published_at
  )
  and (
    published = false
    or published_by = auth.uid()
    or public.academic_is_superadmin()
  )
);

create policy evaluation_publications_management_update
on public.evaluation_publications
for update
to authenticated
using (
  public.academic_can_manage_publication(school_id)
)
with check (
  public.academic_can_manage_publication(school_id)
  and public.academic_is_valid_publication_actor(
    school_id, published, published_by, published_at
  )
  and (
    published = false
    or published_by = auth.uid()
    or public.academic_is_superadmin()
  )
);

-- annual_evaluation_weights
create policy annual_evaluation_weights_internal_select
on public.annual_evaluation_weights
for select
to authenticated
using (
  public.academic_can_read_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy annual_evaluation_weights_internal_insert
on public.annual_evaluation_weights
for insert
to authenticated
with check (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy annual_evaluation_weights_internal_update
on public.annual_evaluation_weights
for update
to authenticated
using (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
)
with check (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy annual_evaluation_weights_internal_delete
on public.annual_evaluation_weights
for delete
to authenticated
using (
  public.academic_can_write_course_subject(
    school_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

-- final_course_grades
create policy final_course_grades_internal_select
on public.final_course_grades
for select
to authenticated
using (
  public.academic_can_read_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy final_course_grades_family_select
on public.final_course_grades
for select
to authenticated
using (
  public.academic_family_can_read_final(
    school_id, student_id, course_id, academic_year_id, status
  )
);

create policy final_course_grades_internal_insert
on public.final_course_grades
for insert
to authenticated
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy final_course_grades_internal_update
on public.final_course_grades
for update
to authenticated
using (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
)
with check (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

create policy final_course_grades_internal_delete
on public.final_course_grades
for delete
to authenticated
using (
  public.academic_can_write_student_result(
    school_id, student_id, teacher_id, course_id, subject_id, academic_year_id
  )
);

-- final_evaluation_publications
create policy final_evaluation_publications_internal_select
on public.final_evaluation_publications
for select
to authenticated
using (
  public.academic_can_read_course(
    school_id, course_id, academic_year_id
  )
);

create policy final_evaluation_publications_family_select
on public.final_evaluation_publications
for select
to authenticated
using (
  public.academic_family_can_read_publication(
    school_id, course_id, academic_year_id, published
  )
);

create policy final_evaluation_publications_management_insert
on public.final_evaluation_publications
for insert
to authenticated
with check (
  public.academic_can_manage_publication(school_id)
  and public.academic_is_valid_publication_actor(
    school_id, published, published_by, published_at
  )
  and (
    published = false
    or published_by = auth.uid()
    or public.academic_is_superadmin()
  )
);

create policy final_evaluation_publications_management_update
on public.final_evaluation_publications
for update
to authenticated
using (
  public.academic_can_manage_publication(school_id)
)
with check (
  public.academic_can_manage_publication(school_id)
  and public.academic_is_valid_publication_actor(
    school_id, published, published_by, published_at
  )
  and (
    published = false
    or published_by = auth.uid()
    or public.academic_is_superadmin()
  )
);

create policy final_evaluation_publications_management_delete
on public.final_evaluation_publications
for delete
to authenticated
using (
  public.academic_can_manage_publication(school_id)
);

-- Table grants are intentionally narrower than Supabase defaults. RLS remains
-- authoritative inside the shared authenticated role.
revoke all on table public.partial_grades from anon, authenticated;
revoke all on table public.evaluation_criteria from anon, authenticated;
revoke all on table public.quarter_final_grades from anon, authenticated;
revoke all on table public.term_subject_grades from anon, authenticated;
revoke all on table public.evaluation_publications from anon, authenticated;
revoke all on table public.annual_evaluation_weights from anon, authenticated;
revoke all on table public.final_course_grades from anon, authenticated;
revoke all on table public.final_evaluation_publications from anon, authenticated;

grant select, insert, update, delete on table public.partial_grades to authenticated;
grant select, insert, update, delete on table public.evaluation_criteria to authenticated;
grant select, insert, update, delete on table public.quarter_final_grades to authenticated;
grant select, insert, update, delete on table public.term_subject_grades to authenticated;
grant select, insert, update on table public.evaluation_publications to authenticated;
grant select, insert, update, delete on table public.annual_evaluation_weights to authenticated;
grant select, insert, update, delete on table public.final_course_grades to authenticated;
grant select, insert, update, delete on table public.final_evaluation_publications to authenticated;

-- Supabase grants EXECUTE broadly by default. Remove anonymous/public execution
-- from all current SECURITY DEFINER helpers while retaining authenticated RLS
-- evaluation and platform-internal execution.
revoke execute on function public.can_manage_school_configuration(uuid) from public, anon;
revoke execute on function public.current_user_has_role(text) from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.has_school_role(uuid, public.app_role[]) from public, anon;
revoke execute on function public.is_active_school_member(uuid) from public, anon;
revoke execute on function public.set_and_validate_academic_operation_school() from public, anon;
revoke execute on function public.set_and_validate_people_school_context() from public, anon;
revoke execute on function public.user_has_active_school_role(uuid, uuid, public.app_role[]) from public, anon;

revoke all on function public.academic_school_is_active(uuid) from public, anon;
revoke all on function public.academic_is_superadmin() from public, anon;
revoke all on function public.academic_is_director(uuid) from public, anon;
revoke all on function public.academic_is_tutor(uuid) from public, anon;
revoke all on function public.academic_is_family(uuid) from public, anon;
revoke all on function public.academic_can_read_student_result(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.academic_can_write_student_result(uuid, uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.academic_can_read_course_subject(uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.academic_can_write_course_subject(uuid, uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.academic_can_read_course(uuid, uuid, uuid) from public, anon;
revoke all on function public.academic_can_manage_publication(uuid) from public, anon;
revoke all on function public.academic_is_valid_publication_actor(uuid, boolean, uuid, timestamptz) from public, anon;
revoke all on function public.academic_family_can_read_partial(uuid, uuid, boolean) from public, anon;
revoke all on function public.academic_family_can_read_term(uuid, uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.academic_family_can_read_final(uuid, uuid, uuid, uuid, text) from public, anon;
revoke all on function public.academic_family_can_read_publication(uuid, uuid, uuid, boolean) from public, anon;

grant execute on function public.academic_school_is_active(uuid) to authenticated, service_role;
grant execute on function public.academic_is_superadmin() to authenticated, service_role;
grant execute on function public.academic_is_director(uuid) to authenticated, service_role;
grant execute on function public.academic_is_tutor(uuid) to authenticated, service_role;
grant execute on function public.academic_is_family(uuid) to authenticated, service_role;
grant execute on function public.academic_can_read_student_result(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.academic_can_write_student_result(uuid, uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.academic_can_read_course_subject(uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.academic_can_write_course_subject(uuid, uuid, uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.academic_can_read_course(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.academic_can_manage_publication(uuid) to authenticated, service_role;
grant execute on function public.academic_is_valid_publication_actor(uuid, boolean, uuid, timestamptz) to authenticated, service_role;
grant execute on function public.academic_family_can_read_partial(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function public.academic_family_can_read_term(uuid, uuid, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.academic_family_can_read_final(uuid, uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.academic_family_can_read_publication(uuid, uuid, uuid, boolean) to authenticated, service_role;

do $postconditions$
declare
  target_tables constant text[] := array[
    'annual_evaluation_weights',
    'evaluation_criteria',
    'evaluation_publications',
    'final_course_grades',
    'final_evaluation_publications',
    'partial_grades',
    'quarter_final_grades',
    'term_subject_grades'
  ];
begin
  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
  ) <> 36 then
    raise exception '040 postcondition failed: expected 36 tenant-aware policies.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
      and (
        coalesce(qual, '') ~* 'current_user_has_role|profiles[.]role|USING[[:space:]]*[(][[:space:]]*true'
        or coalesce(with_check, '') ~* 'current_user_has_role|profiles[.]role|WITH CHECK[[:space:]]*[(][[:space:]]*true'
      )
  ) then
    raise exception '040 postcondition failed: an unsafe legacy authorization expression remains.';
  end if;

  if exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = any(target_tables)
      and grantee = 'anon'
  ) then
    raise exception '040 postcondition failed: anon retains an academic table grant.';
  end if;

  if exists (
    select 1
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.prosecdef
      and (
        has_function_privilege('public', procedure.oid, 'EXECUTE')
        or has_function_privilege('anon', procedure.oid, 'EXECUTE')
      )
  ) then
    raise exception '040 postcondition failed: a SECURITY DEFINER function remains public or anonymous.';
  end if;
end
$postconditions$;

commit;
