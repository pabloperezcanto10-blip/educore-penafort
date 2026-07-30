/*
DO NOT APPLY
DESIGN ONLY
SPRINT 20.2H
NOT A MIGRATION

This entire file is intentionally wrapped in a block comment. It is a reviewed
SQL design, not an executable migration. It must be split into 039A, 039B and
039C work before any statement is promoted to supabase/migrations.

TARGET ORDER
  039A ownership, deterministic backfill and constraints
  039B tenant-aware triggers, RLS and grants
  039C application reads/actions and generated types

Stable Peñafort tenant assertion:
  20f20000-0000-4000-8000-000000000001

=============================================================================
039A - PRECONDITIONS
=============================================================================

-- Capture row counts and business-column checksums before the transaction.
-- Abort unless verification/020_2h_operational_academic_preflight.sql returns
-- zero for every anomaly and future unique conflict.

begin;

lock table public.partial_grades in share row exclusive mode;
lock table public.evaluation_criteria in share row exclusive mode;
lock table public.quarter_final_grades in share row exclusive mode;
lock table public.term_subject_grades in share row exclusive mode;
lock table public.evaluation_publications in share row exclusive mode;
lock table public.annual_evaluation_weights in share row exclusive mode;
lock table public.final_course_grades in share row exclusive mode;
lock table public.final_evaluation_publications in share row exclusive mode;

alter table public.partial_grades
  add column school_id uuid;
alter table public.evaluation_criteria
  add column school_id uuid;
alter table public.quarter_final_grades
  add column school_id uuid;
alter table public.term_subject_grades
  add column school_id uuid;
alter table public.evaluation_publications
  add column school_id uuid;
alter table public.annual_evaluation_weights
  add column school_id uuid;
alter table public.final_course_grades
  add column school_id uuid;
alter table public.final_evaluation_publications
  add column school_id uuid;

=============================================================================
039A - DETERMINISTIC CANDIDATES
=============================================================================

-- Student-owned rows. The candidate exists only when every root agrees and
-- the exact teacher assignment exists. Never replace this with COALESCE.

with candidates as (
  select
    row_data.id,
    student.school_id
  from public.partial_grades row_data
  join public.students student
    on student.id = row_data.student_id
   and student.course_id = row_data.course_id
   and student.academic_year_id = row_data.academic_year_id
  join public.courses course
    on course.id = row_data.course_id
   and course.school_id = student.school_id
   and course.academic_year_id = row_data.academic_year_id
  join public.subjects subject
    on subject.id = row_data.subject_id
   and subject.school_id = student.school_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
   and academic_year.school_id = student.school_id
  join public.teacher_assignments assignment
    on assignment.school_id = student.school_id
   and assignment.teacher_id = row_data.teacher_id
   and assignment.course_id = row_data.course_id
   and assignment.subject_id = row_data.subject_id
   and assignment.academic_year_id = row_data.academic_year_id
)
update public.partial_grades row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

-- Repeat the same candidate shape for:
--   quarter_final_grades
--   term_subject_grades
--   final_course_grades
-- No generic dynamic function is proposed for backfill because explicit SQL
-- is easier to review and gives each table an independent stop count.

-- Course-owned teacher rows.
with candidates as (
  select
    row_data.id,
    course.school_id
  from public.evaluation_criteria row_data
  join public.courses course
    on course.id = row_data.course_id
   and course.academic_year_id = row_data.academic_year_id
  join public.subjects subject
    on subject.id = row_data.subject_id
   and subject.school_id = course.school_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
   and academic_year.school_id = course.school_id
  join public.teacher_assignments assignment
    on assignment.school_id = course.school_id
   and assignment.teacher_id = row_data.teacher_id
   and assignment.course_id = row_data.course_id
   and assignment.subject_id = row_data.subject_id
   and assignment.academic_year_id = row_data.academic_year_id
)
update public.evaluation_criteria row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

-- Repeat the same candidate shape for annual_evaluation_weights.

-- Publication rows derive from course + academic year. Published rows require
-- an active publisher membership in the same school.
with candidates as (
  select
    row_data.id,
    course.school_id
  from public.evaluation_publications row_data
  join public.courses course
    on course.id = row_data.course_id
   and course.academic_year_id = row_data.academic_year_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
   and academic_year.school_id = course.school_id
  where row_data.published = false
     or exists (
       select 1
       from public.school_memberships membership
       join public.schools school
         on school.id = membership.school_id
        and school.status = 'active'
       where membership.school_id = course.school_id
         and membership.user_id = row_data.published_by
         and membership.active = true
         and membership.role in ('director', 'superadmin')
     )
)
update public.evaluation_publications row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

-- Repeat the same publication candidate for final_evaluation_publications.

=============================================================================
039A - HARD STOP GATES
=============================================================================

-- Each query must return zero before constraints are added.

select count(*) as unresolved_partial_grades
from public.partial_grades
where school_id is null;

select count(*) as unresolved_evaluation_criteria
from public.evaluation_criteria
where school_id is null;

select count(*) as unresolved_quarter_final_grades
from public.quarter_final_grades
where school_id is null;

select count(*) as unresolved_term_subject_grades
from public.term_subject_grades
where school_id is null;

select count(*) as unresolved_evaluation_publications
from public.evaluation_publications
where school_id is null;

select count(*) as unresolved_annual_evaluation_weights
from public.annual_evaluation_weights
where school_id is null;

select count(*) as unresolved_final_course_grades
from public.final_course_grades
where school_id is null;

select count(*) as unresolved_final_evaluation_publications
from public.final_evaluation_publications
where school_id is null;

-- Also require zero contradictions, missing course-subject relations, missing
-- assignments and future unique conflicts from the 020_2h verification files.
-- Abort explicitly if any count is non-zero.

=============================================================================
039A - COMPOSITE INTEGRITY
=============================================================================

alter table public.partial_grades
  add constraint partial_grades_school_fkey
    foreign key (school_id) references public.schools(id),
  add constraint partial_grades_student_school_fkey
    foreign key (student_id, school_id)
    references public.students(id, school_id),
  add constraint partial_grades_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id),
  add constraint partial_grades_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id),
  add constraint partial_grades_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id),
  add constraint partial_grades_assignment_school_fkey
    foreign key (
      school_id,
      teacher_id,
      course_id,
      subject_id,
      academic_year_id
    )
    references public.teacher_assignments (
      school_id,
      teacher_id,
      course_id,
      subject_id,
      academic_year_id
    );

-- Apply the same student/course/subject/year/assignment constraint set to:
--   quarter_final_grades
--   term_subject_grades
--   final_course_grades

-- Apply school/course/subject/year/assignment constraints to:
--   evaluation_criteria
--   annual_evaluation_weights

-- Apply school/course/year constraints to:
--   evaluation_publications
--   final_evaluation_publications

-- A trigger must additionally require an existing course_subject row for the
-- same school/year/course/subject. A simple FK is not possible because the
-- current course_subject uniqueness includes coalesce(track, '').

create unique index partial_grades_id_school_id_uidx
  on public.partial_grades (id, school_id);
create unique index evaluation_criteria_id_school_id_uidx
  on public.evaluation_criteria (id, school_id);
create unique index quarter_final_grades_id_school_id_uidx
  on public.quarter_final_grades (id, school_id);
create unique index term_subject_grades_id_school_id_uidx
  on public.term_subject_grades (id, school_id);
create unique index evaluation_publications_id_school_id_uidx
  on public.evaluation_publications (id, school_id);
create unique index annual_evaluation_weights_id_school_id_uidx
  on public.annual_evaluation_weights (id, school_id);
create unique index final_course_grades_id_school_id_uidx
  on public.final_course_grades (id, school_id);
create unique index final_evaluation_publications_id_school_id_uidx
  on public.final_evaluation_publications (id, school_id);

-- Create tenant-aware replacements before removing legacy uniqueness.
create unique index partial_grades_school_assessment_uidx
  on public.partial_grades (
    school_id,
    academic_year_id,
    student_id,
    subject_id,
    term,
    assessment_type,
    assessment_name
  );

create unique index evaluation_criteria_school_name_uidx
  on public.evaluation_criteria (
    school_id,
    academic_year_id,
    teacher_id,
    course_id,
    subject_id,
    term,
    name
  );

create unique index quarter_final_grades_school_term_uidx
  on public.quarter_final_grades (
    school_id,
    academic_year_id,
    student_id,
    subject_id,
    teacher_id,
    course_id,
    term
  );

create unique index term_subject_grades_school_term_uidx
  on public.term_subject_grades (
    school_id,
    academic_year_id,
    student_id,
    subject_id,
    term
  );

create unique index evaluation_publications_school_term_uidx
  on public.evaluation_publications (
    school_id,
    academic_year_id,
    course_id,
    term
  );

create unique index annual_weights_school_uidx
  on public.annual_evaluation_weights (
    school_id,
    academic_year_id,
    teacher_id,
    course_id,
    subject_id
  );

create unique index final_course_grades_school_uidx
  on public.final_course_grades (
    school_id,
    academic_year_id,
    student_id,
    subject_id
  );

create unique index final_publications_school_uidx
  on public.final_evaluation_publications (
    school_id,
    academic_year_id,
    course_id
  );

-- Only after successful creation, remove the eight legacy uniqueness objects
-- and give the tenant indexes stable constraint names where ON CONFLICT needs
-- a named column set.

alter table public.partial_grades alter column school_id set not null;
alter table public.evaluation_criteria alter column school_id set not null;
alter table public.quarter_final_grades alter column school_id set not null;
alter table public.term_subject_grades alter column school_id set not null;
alter table public.evaluation_publications alter column school_id set not null;
alter table public.annual_evaluation_weights alter column school_id set not null;
alter table public.final_course_grades alter column school_id set not null;
alter table public.final_evaluation_publications alter column school_id set not null;

-- Commit 039A only after postflight counts and checksums match.
commit;

=============================================================================
039B - TENANT VALIDATION TRIGGER
=============================================================================

-- Replace the migration-023 no-argument default-year triggers for the eight
-- tables. The validator must not use active_academic_year_id() without a
-- school argument and must not trust school_id supplied by the client.

create or replace function public.set_and_validate_academic_operation_context()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  resolved_school_id uuid;
begin
  -- Per-table branches resolve the school from course/student roots.
  -- They compare every present root and raise on any mismatch.
  -- They require an exact teacher_assignment for teacher-owned tables.
  -- They require an active Director/Superadmin membership for publication.
  -- They validate the matching course_subject row.
  -- They never infer from profiles.role or a first membership.

  if resolved_school_id is null then
    raise exception 'Academic operation has no deterministic school context.';
  end if;

  if new.school_id is not null and new.school_id <> resolved_school_id then
    raise exception 'Academic operation crosses school boundaries.';
  end if;

  new.school_id := resolved_school_id;
  return new;
end
$function$;

revoke all on function public.set_and_validate_academic_operation_context()
  from public;
grant execute on function public.set_and_validate_academic_operation_context()
  to authenticated;

-- Install BEFORE INSERT OR UPDATE triggers on all eight 039 tables, replacing
-- their global *_default_academic_year trigger. Updated-at triggers remain.

=============================================================================
039B - RLS SHAPES
=============================================================================

-- Representative Tutor predicate for teacher-owned rows:
teacher_id = auth.uid()
and public.has_school_role(
  school_id,
  array['tutor']::public.app_role[]
)
and exists (
  select 1
  from public.teacher_assignments assignment
  where assignment.school_id = partial_grades.school_id
    and assignment.teacher_id = auth.uid()
    and assignment.course_id = partial_grades.course_id
    and assignment.subject_id = partial_grades.subject_id
    and assignment.academic_year_id = partial_grades.academic_year_id
)
and exists (
  select 1
  from public.students student
  where student.id = partial_grades.student_id
    and student.school_id = partial_grades.school_id
    and student.course_id = partial_grades.course_id
    and student.academic_year_id = partial_grades.academic_year_id
);

-- Representative Director predicate:
public.has_school_role(
  school_id,
  array['director']::public.app_role[]
);

-- Superadmin may read globally through current global authority. Operational
-- writes still require a selected school and server-side contextual checks.

-- Family partial-grade predicate preserves current product behavior:
visible_to_family = true
and public.has_school_role(
  school_id,
  array['family']::public.app_role[]
)
and exists (
  select 1
  from public.parent_students relation
  where relation.school_id = partial_grades.school_id
    and relation.parent_id = auth.uid()
    and relation.student_id = partial_grades.student_id
);

-- Family term-grade predicate:
status = 'closed'
and public.has_school_role(
  school_id,
  array['family']::public.app_role[]
)
and exists (
  select 1
  from public.parent_students relation
  where relation.school_id = term_subject_grades.school_id
    and relation.parent_id = auth.uid()
    and relation.student_id = term_subject_grades.student_id
)
and exists (
  select 1
  from public.evaluation_publications publication
  where publication.school_id = term_subject_grades.school_id
    and publication.academic_year_id =
      term_subject_grades.academic_year_id
    and publication.course_id = term_subject_grades.course_id
    and publication.term = term_subject_grades.term
    and publication.published = true
);

-- Final family policy mirrors the term predicate with
-- final_evaluation_publications and requires final_course_grades.status =
-- 'closed'. No Family access is proposed for criteria, weights or quarter
-- final rows.

=============================================================================
039C - APPLICATION CONTRACT
=============================================================================

-- Regenerate database types after 039A.
-- Every 039 SELECT must begin with .eq("school_id", activeSchoolId).
-- Every 039 write must include server-derived school_id.
-- Every ON CONFLICT list must include school_id.
-- Resource IDs supplied by forms must be reloaded by school_id before use.
-- Service-role clients must retain authentication, active membership, role,
-- resource ownership and direct school predicates.
-- active academic year must be resolved with getActiveAcademicYear(schoolId).

=============================================================================
POSTFLIGHT AND ROLLBACK
=============================================================================

-- Run all 020_2h postflight checks and authenticated role tests.
-- Compare row counts and checksums captured before 039A.
-- Any non-zero cross-tenant count blocks deployment.

-- Rollback preference:
-- 1. keep school_id and backfilled values;
-- 2. restore the reviewed prior policies if runtime access regresses;
-- 3. deploy the previous application version;
-- 4. relax only the new constraint proven to be the blocker;
-- 5. use the recoverable staging/production restore point if data changed.
-- Do not drop tenant columns or rewrite academic content as first response.

*/
