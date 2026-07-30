-- STAGING FIRST - SPRINT 20.2I
-- Structural tenant scope for academic operations.
-- Do not promote to production without a separate approval sprint.
--
-- This migration does not alter RLS, grants, publication behavior, grades,
-- criteria, weights, observations, recommendations or functional timestamps.

begin;

lock table public.partial_grades in share row exclusive mode;
lock table public.evaluation_criteria in share row exclusive mode;
lock table public.quarter_final_grades in share row exclusive mode;
lock table public.term_subject_grades in share row exclusive mode;
lock table public.evaluation_publications in share row exclusive mode;
lock table public.annual_evaluation_weights in share row exclusive mode;
lock table public.final_course_grades in share row exclusive mode;
lock table public.final_evaluation_publications in share row exclusive mode;

do $preconditions$
declare
  expected_tables constant text[] := array[
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  ];
begin
  if to_regclass('public.schools') is null then
    raise exception 'Migration 039A requires public.schools.';
  end if;

  if not exists (
    select 1
    from public.schools school
    where school.id = '20f20000-0000-4000-8000-000000000001'::uuid
      and school.slug = 'colegio-penafort'
      and school.status = 'active'
  ) then
    raise exception 'Migration 039A requires the stable active Penafort tenant.';
  end if;

  if (
    select count(*)
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind = 'r'
      and relation.relname = any(expected_tables)
  ) <> cardinality(expected_tables) then
    raise exception 'Migration 039A requires exactly the eight audited academic-operation tables.';
  end if;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'academic_years',
        'courses',
        'subjects',
        'students',
        'teacher_assignments',
        'course_subjects'
      )
      and column_name = 'school_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) <> 6 then
    raise exception 'Migration 039A requires tenant-aware academic and people roots from 036-037.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(expected_tables)
      and column_name = 'school_id'
  ) then
    raise exception 'Refusing 039A: an academic-operation school_id column already exists.';
  end if;

  if (
    select count(*)
    from pg_constraint constraint_data
    join pg_class relation on relation.oid = constraint_data.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(expected_tables)
      and constraint_data.conname in (
        'partial_grades_student_id_fkey',
        'partial_grades_course_id_fkey',
        'partial_grades_subject_id_fkey',
        'partial_grades_academic_year_id_fkey',
        'evaluation_criteria_course_id_fkey',
        'evaluation_criteria_subject_id_fkey',
        'evaluation_criteria_academic_year_id_fkey',
        'quarter_final_grades_student_id_fkey',
        'quarter_final_grades_course_id_fkey',
        'quarter_final_grades_subject_id_fkey',
        'quarter_final_grades_academic_year_id_fkey',
        'term_subject_grades_student_id_fkey',
        'term_subject_grades_course_id_fkey',
        'term_subject_grades_subject_id_fkey',
        'term_subject_grades_academic_year_id_fkey',
        'evaluation_publications_course_id_fkey',
        'evaluation_publications_academic_year_id_fkey',
        'annual_evaluation_weights_course_id_fkey',
        'annual_evaluation_weights_subject_id_fkey',
        'annual_evaluation_weights_academic_year_id_fkey',
        'final_course_grades_student_id_fkey',
        'final_course_grades_course_id_fkey',
        'final_course_grades_subject_id_fkey',
        'final_course_grades_academic_year_id_fkey',
        'final_evaluation_publications_course_id_fkey',
        'final_evaluation_publications_academic_year_id_fkey'
      )
  ) <> 26 then
    raise exception 'Refusing 039A: a replaceable academic-operation foreign key is missing.';
  end if;
end
$preconditions$;

create temporary table _039a_functional_baseline (
  table_name text primary key,
  row_count bigint not null,
  functional_hash text not null
) on commit drop;

do $capture_baseline$
declare
  table_name text;
  row_count bigint;
  functional_hash text;
begin
  foreach table_name in array array[
    'partial_grades',
    'evaluation_criteria',
    'quarter_final_grades',
    'term_subject_grades',
    'evaluation_publications',
    'annual_evaluation_weights',
    'final_course_grades',
    'final_evaluation_publications'
  ]
  loop
    execute format(
      'select count(*), md5(coalesce(string_agg(to_jsonb(row_data)::text, ''|'' order by row_data.id::text), '''')) from public.%I row_data',
      table_name
    )
    into row_count, functional_hash;

    insert into _039a_functional_baseline (
      table_name,
      row_count,
      functional_hash
    )
    values (table_name, row_count, functional_hash);
  end loop;
end
$capture_baseline$;

do $deterministic_preflight$
begin
  if exists (
    select 1
    from public.partial_grades row_data
    left join public.students student
      on student.id = row_data.student_id
     and student.course_id = row_data.course_id
     and student.academic_year_id = row_data.academic_year_id
    left join public.courses course
      on course.id = row_data.course_id
     and course.school_id = student.school_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.subjects subject
      on subject.id = row_data.subject_id
     and subject.school_id = student.school_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = student.school_id
    where student.id is null
       or course.id is null
       or subject.id is null
       or academic_year.id is null
       or not exists (
         select 1
         from public.teacher_assignments assignment
         where assignment.school_id = student.school_id
           and assignment.teacher_id = row_data.teacher_id
           and assignment.course_id = row_data.course_id
           and assignment.subject_id = row_data.subject_id
           and assignment.academic_year_id = row_data.academic_year_id
       )
       or not exists (
         select 1
         from public.course_subjects relation
         where relation.school_id = student.school_id
           and relation.course_id = row_data.course_id
           and relation.subject_id = row_data.subject_id
           and relation.academic_year_id = row_data.academic_year_id
       )
  ) then
    raise exception 'Refusing 039A: partial_grades contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.quarter_final_grades row_data
    left join public.students student
      on student.id = row_data.student_id
     and student.course_id = row_data.course_id
     and student.academic_year_id = row_data.academic_year_id
    left join public.courses course
      on course.id = row_data.course_id
     and course.school_id = student.school_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.subjects subject
      on subject.id = row_data.subject_id
     and subject.school_id = student.school_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = student.school_id
    where student.id is null
       or course.id is null
       or subject.id is null
       or academic_year.id is null
       or not exists (
         select 1
         from public.teacher_assignments assignment
         where assignment.school_id = student.school_id
           and assignment.teacher_id = row_data.teacher_id
           and assignment.course_id = row_data.course_id
           and assignment.subject_id = row_data.subject_id
           and assignment.academic_year_id = row_data.academic_year_id
       )
       or not exists (
         select 1
         from public.course_subjects relation
         where relation.school_id = student.school_id
           and relation.course_id = row_data.course_id
           and relation.subject_id = row_data.subject_id
           and relation.academic_year_id = row_data.academic_year_id
       )
  ) then
    raise exception 'Refusing 039A: quarter_final_grades contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.term_subject_grades row_data
    left join public.students student
      on student.id = row_data.student_id
     and student.course_id = row_data.course_id
     and student.academic_year_id = row_data.academic_year_id
    left join public.courses course
      on course.id = row_data.course_id
     and course.school_id = student.school_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.subjects subject
      on subject.id = row_data.subject_id
     and subject.school_id = student.school_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = student.school_id
    where student.id is null
       or course.id is null
       or subject.id is null
       or academic_year.id is null
       or not exists (
         select 1
         from public.teacher_assignments assignment
         where assignment.school_id = student.school_id
           and assignment.teacher_id = row_data.teacher_id
           and assignment.course_id = row_data.course_id
           and assignment.subject_id = row_data.subject_id
           and assignment.academic_year_id = row_data.academic_year_id
       )
       or not exists (
         select 1
         from public.course_subjects relation
         where relation.school_id = student.school_id
           and relation.course_id = row_data.course_id
           and relation.subject_id = row_data.subject_id
           and relation.academic_year_id = row_data.academic_year_id
       )
  ) then
    raise exception 'Refusing 039A: term_subject_grades contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.final_course_grades row_data
    left join public.students student
      on student.id = row_data.student_id
     and student.course_id = row_data.course_id
     and student.academic_year_id = row_data.academic_year_id
    left join public.courses course
      on course.id = row_data.course_id
     and course.school_id = student.school_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.subjects subject
      on subject.id = row_data.subject_id
     and subject.school_id = student.school_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = student.school_id
    where student.id is null
       or course.id is null
       or subject.id is null
       or academic_year.id is null
       or not exists (
         select 1
         from public.teacher_assignments assignment
         where assignment.school_id = student.school_id
           and assignment.teacher_id = row_data.teacher_id
           and assignment.course_id = row_data.course_id
           and assignment.subject_id = row_data.subject_id
           and assignment.academic_year_id = row_data.academic_year_id
       )
       or not exists (
         select 1
         from public.course_subjects relation
         where relation.school_id = student.school_id
           and relation.course_id = row_data.course_id
           and relation.subject_id = row_data.subject_id
           and relation.academic_year_id = row_data.academic_year_id
       )
  ) then
    raise exception 'Refusing 039A: final_course_grades contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.evaluation_criteria row_data
    left join public.courses course
      on course.id = row_data.course_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.subjects subject
      on subject.id = row_data.subject_id
     and subject.school_id = course.school_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = course.school_id
    where course.id is null
       or subject.id is null
       or academic_year.id is null
       or not exists (
         select 1
         from public.teacher_assignments assignment
         where assignment.school_id = course.school_id
           and assignment.teacher_id = row_data.teacher_id
           and assignment.course_id = row_data.course_id
           and assignment.subject_id = row_data.subject_id
           and assignment.academic_year_id = row_data.academic_year_id
       )
       or not exists (
         select 1
         from public.course_subjects relation
         where relation.school_id = course.school_id
           and relation.course_id = row_data.course_id
           and relation.subject_id = row_data.subject_id
           and relation.academic_year_id = row_data.academic_year_id
       )
  ) then
    raise exception 'Refusing 039A: evaluation_criteria contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.annual_evaluation_weights row_data
    left join public.courses course
      on course.id = row_data.course_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.subjects subject
      on subject.id = row_data.subject_id
     and subject.school_id = course.school_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = course.school_id
    where course.id is null
       or subject.id is null
       or academic_year.id is null
       or not exists (
         select 1
         from public.teacher_assignments assignment
         where assignment.school_id = course.school_id
           and assignment.teacher_id = row_data.teacher_id
           and assignment.course_id = row_data.course_id
           and assignment.subject_id = row_data.subject_id
           and assignment.academic_year_id = row_data.academic_year_id
       )
       or not exists (
         select 1
         from public.course_subjects relation
         where relation.school_id = course.school_id
           and relation.course_id = row_data.course_id
           and relation.subject_id = row_data.subject_id
           and relation.academic_year_id = row_data.academic_year_id
       )
  ) then
    raise exception 'Refusing 039A: annual_evaluation_weights contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.evaluation_publications row_data
    left join public.courses course
      on course.id = row_data.course_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = course.school_id
    where course.id is null or academic_year.id is null
  ) then
    raise exception 'Refusing 039A: evaluation_publications contains an unresolved academic context.';
  end if;

  if exists (
    select 1
    from public.final_evaluation_publications row_data
    left join public.courses course
      on course.id = row_data.course_id
     and course.academic_year_id = row_data.academic_year_id
    left join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
     and academic_year.school_id = course.school_id
    where course.id is null or academic_year.id is null
  ) then
    raise exception 'Refusing 039A: final_evaluation_publications contains an unresolved academic context.';
  end if;
end
$deterministic_preflight$;

alter table public.partial_grades add column school_id uuid;
alter table public.evaluation_criteria add column school_id uuid;
alter table public.quarter_final_grades add column school_id uuid;
alter table public.term_subject_grades add column school_id uuid;
alter table public.evaluation_publications add column school_id uuid;
alter table public.annual_evaluation_weights add column school_id uuid;
alter table public.final_course_grades add column school_id uuid;
alter table public.final_evaluation_publications add column school_id uuid;

-- Preserve functional timestamps while adding only tenant ownership.
alter table public.term_subject_grades
  disable trigger set_term_subject_grades_updated_at;
alter table public.evaluation_publications
  disable trigger set_evaluation_publications_updated_at;
alter table public.annual_evaluation_weights
  disable trigger annual_evaluation_weights_updated_at;
alter table public.final_course_grades
  disable trigger final_course_grades_updated_at;
alter table public.final_evaluation_publications
  disable trigger final_evaluation_publications_updated_at;

with candidates as (
  select row_data.id, student.school_id
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

with candidates as (
  select row_data.id, course.school_id
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

with candidates as (
  select row_data.id, student.school_id
  from public.quarter_final_grades row_data
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
update public.quarter_final_grades row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

with candidates as (
  select row_data.id, student.school_id
  from public.term_subject_grades row_data
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
update public.term_subject_grades row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

with candidates as (
  select row_data.id, course.school_id
  from public.evaluation_publications row_data
  join public.courses course
    on course.id = row_data.course_id
   and course.academic_year_id = row_data.academic_year_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
   and academic_year.school_id = course.school_id
)
update public.evaluation_publications row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

with candidates as (
  select row_data.id, course.school_id
  from public.annual_evaluation_weights row_data
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
update public.annual_evaluation_weights row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

with candidates as (
  select row_data.id, student.school_id
  from public.final_course_grades row_data
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
update public.final_course_grades row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

with candidates as (
  select row_data.id, course.school_id
  from public.final_evaluation_publications row_data
  join public.courses course
    on course.id = row_data.course_id
   and course.academic_year_id = row_data.academic_year_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
   and academic_year.school_id = course.school_id
)
update public.final_evaluation_publications row_data
set school_id = candidates.school_id
from candidates
where candidates.id = row_data.id;

alter table public.term_subject_grades
  enable trigger set_term_subject_grades_updated_at;
alter table public.evaluation_publications
  enable trigger set_evaluation_publications_updated_at;
alter table public.annual_evaluation_weights
  enable trigger annual_evaluation_weights_updated_at;
alter table public.final_course_grades
  enable trigger final_course_grades_updated_at;
alter table public.final_evaluation_publications
  enable trigger final_evaluation_publications_updated_at;

do $backfill_postconditions$
begin
  if exists (select 1 from public.partial_grades where school_id is null)
     or exists (select 1 from public.evaluation_criteria where school_id is null)
     or exists (select 1 from public.quarter_final_grades where school_id is null)
     or exists (select 1 from public.term_subject_grades where school_id is null)
     or exists (select 1 from public.evaluation_publications where school_id is null)
     or exists (select 1 from public.annual_evaluation_weights where school_id is null)
     or exists (select 1 from public.final_course_grades where school_id is null)
     or exists (select 1 from public.final_evaluation_publications where school_id is null) then
    raise exception 'Migration 039A left an academic-operation row without a deterministic school.';
  end if;
end
$backfill_postconditions$;

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

-- Keep the eight legacy uniqueness objects temporarily. Current ON CONFLICT
-- clauses still target their legacy column sets. The new tenant-aware indexes
-- are the canonical uniqueness and 039C will migrate callers before retiring
-- the compatibility objects.

create index partial_grades_school_lookup_idx
  on public.partial_grades (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    term
  );
create index partial_grades_school_student_idx
  on public.partial_grades (school_id, student_id, created_at desc);
create index evaluation_criteria_school_lookup_idx
  on public.evaluation_criteria (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    term,
    active
  );
create index quarter_final_grades_school_lookup_idx
  on public.quarter_final_grades (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    term
  );
create index term_subject_grades_school_lookup_idx
  on public.term_subject_grades (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    term,
    status
  );
create index term_subject_grades_school_student_idx
  on public.term_subject_grades (school_id, student_id, term);
create index evaluation_publications_school_lookup_idx
  on public.evaluation_publications (
    school_id,
    academic_year_id,
    course_id,
    term,
    published
  );
create index final_course_grades_school_lookup_idx
  on public.final_course_grades (
    school_id,
    academic_year_id,
    course_id,
    subject_id,
    status
  );
create index final_course_grades_school_student_idx
  on public.final_course_grades (school_id, student_id);
create index final_evaluation_publications_school_lookup_idx
  on public.final_evaluation_publications (
    school_id,
    academic_year_id,
    course_id,
    published
  );

-- Replace legacy single-column roots. Keeping both simple and composite FKs
-- would create ambiguous PostgREST relationships.
alter table public.partial_grades
  drop constraint partial_grades_student_id_fkey,
  drop constraint partial_grades_course_id_fkey,
  drop constraint partial_grades_subject_id_fkey,
  drop constraint partial_grades_academic_year_id_fkey;
alter table public.evaluation_criteria
  drop constraint evaluation_criteria_course_id_fkey,
  drop constraint evaluation_criteria_subject_id_fkey,
  drop constraint evaluation_criteria_academic_year_id_fkey;
alter table public.quarter_final_grades
  drop constraint quarter_final_grades_student_id_fkey,
  drop constraint quarter_final_grades_course_id_fkey,
  drop constraint quarter_final_grades_subject_id_fkey,
  drop constraint quarter_final_grades_academic_year_id_fkey;
alter table public.term_subject_grades
  drop constraint term_subject_grades_student_id_fkey,
  drop constraint term_subject_grades_course_id_fkey,
  drop constraint term_subject_grades_subject_id_fkey,
  drop constraint term_subject_grades_academic_year_id_fkey;
alter table public.evaluation_publications
  drop constraint evaluation_publications_course_id_fkey,
  drop constraint evaluation_publications_academic_year_id_fkey;
alter table public.annual_evaluation_weights
  drop constraint annual_evaluation_weights_course_id_fkey,
  drop constraint annual_evaluation_weights_subject_id_fkey,
  drop constraint annual_evaluation_weights_academic_year_id_fkey;
alter table public.final_course_grades
  drop constraint final_course_grades_student_id_fkey,
  drop constraint final_course_grades_course_id_fkey,
  drop constraint final_course_grades_subject_id_fkey,
  drop constraint final_course_grades_academic_year_id_fkey;
alter table public.final_evaluation_publications
  drop constraint final_evaluation_publications_course_id_fkey,
  drop constraint final_evaluation_publications_academic_year_id_fkey;

alter table public.partial_grades
  add constraint partial_grades_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint partial_grades_student_school_fkey
    foreign key (student_id, school_id)
    references public.students(id, school_id) on delete cascade,
  add constraint partial_grades_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete restrict,
  add constraint partial_grades_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id) on delete restrict,
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

alter table public.evaluation_criteria
  add constraint evaluation_criteria_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint evaluation_criteria_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint evaluation_criteria_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id) on delete cascade,
  add constraint evaluation_criteria_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id),
  add constraint evaluation_criteria_assignment_school_fkey
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

alter table public.quarter_final_grades
  add constraint quarter_final_grades_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint quarter_final_grades_student_school_fkey
    foreign key (student_id, school_id)
    references public.students(id, school_id) on delete cascade,
  add constraint quarter_final_grades_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint quarter_final_grades_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id) on delete cascade,
  add constraint quarter_final_grades_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id),
  add constraint quarter_final_grades_assignment_school_fkey
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

alter table public.term_subject_grades
  add constraint term_subject_grades_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint term_subject_grades_student_school_fkey
    foreign key (student_id, school_id)
    references public.students(id, school_id) on delete cascade,
  add constraint term_subject_grades_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint term_subject_grades_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id) on delete cascade,
  add constraint term_subject_grades_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id),
  add constraint term_subject_grades_assignment_school_fkey
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

alter table public.evaluation_publications
  add constraint evaluation_publications_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint evaluation_publications_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint evaluation_publications_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id);

alter table public.annual_evaluation_weights
  add constraint annual_evaluation_weights_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint annual_evaluation_weights_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint annual_evaluation_weights_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id) on delete cascade,
  add constraint annual_evaluation_weights_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id),
  add constraint annual_evaluation_weights_assignment_school_fkey
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

alter table public.final_course_grades
  add constraint final_course_grades_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint final_course_grades_student_school_fkey
    foreign key (student_id, school_id)
    references public.students(id, school_id) on delete cascade,
  add constraint final_course_grades_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint final_course_grades_subject_school_fkey
    foreign key (subject_id, school_id)
    references public.subjects(id, school_id) on delete cascade,
  add constraint final_course_grades_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id),
  add constraint final_course_grades_assignment_school_fkey
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

alter table public.final_evaluation_publications
  add constraint final_evaluation_publications_school_id_fkey
    foreign key (school_id) references public.schools(id) on delete restrict,
  add constraint final_evaluation_publications_course_school_fkey
    foreign key (course_id, school_id)
    references public.courses(id, school_id) on delete cascade,
  add constraint final_evaluation_publications_year_school_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years(id, school_id);

-- Compatibility bridge for current application writes. This is strictly
-- structural: it derives tenant ownership from row roots and does not inspect
-- roles, visibility, publication state or active-school cookies.
create or replace function public.set_and_validate_academic_operation_school()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  derived_school_id uuid;
begin
  case tg_table_name
    when 'partial_grades',
         'quarter_final_grades',
         'term_subject_grades',
         'final_course_grades' then
      select course.school_id
      into derived_school_id
      from public.courses course
      join public.students student
        on student.id = new.student_id
       and student.school_id = course.school_id
       and student.course_id = new.course_id
       and student.academic_year_id = new.academic_year_id
      join public.subjects subject
        on subject.id = new.subject_id
       and subject.school_id = course.school_id
      join public.academic_years academic_year
        on academic_year.id = new.academic_year_id
       and academic_year.school_id = course.school_id
      where course.id = new.course_id
        and course.academic_year_id = new.academic_year_id
        and exists (
          select 1
          from public.teacher_assignments assignment
          where assignment.school_id = course.school_id
            and assignment.teacher_id = new.teacher_id
            and assignment.course_id = new.course_id
            and assignment.subject_id = new.subject_id
            and assignment.academic_year_id = new.academic_year_id
        )
        and exists (
          select 1
          from public.course_subjects relation
          where relation.school_id = course.school_id
            and relation.course_id = new.course_id
            and relation.subject_id = new.subject_id
            and relation.academic_year_id = new.academic_year_id
        );

    when 'evaluation_criteria',
         'annual_evaluation_weights' then
      select course.school_id
      into derived_school_id
      from public.courses course
      join public.subjects subject
        on subject.id = new.subject_id
       and subject.school_id = course.school_id
      join public.academic_years academic_year
        on academic_year.id = new.academic_year_id
       and academic_year.school_id = course.school_id
      where course.id = new.course_id
        and course.academic_year_id = new.academic_year_id
        and exists (
          select 1
          from public.teacher_assignments assignment
          where assignment.school_id = course.school_id
            and assignment.teacher_id = new.teacher_id
            and assignment.course_id = new.course_id
            and assignment.subject_id = new.subject_id
            and assignment.academic_year_id = new.academic_year_id
        )
        and exists (
          select 1
          from public.course_subjects relation
          where relation.school_id = course.school_id
            and relation.course_id = new.course_id
            and relation.subject_id = new.subject_id
            and relation.academic_year_id = new.academic_year_id
        );

    when 'evaluation_publications',
         'final_evaluation_publications' then
      select course.school_id
      into derived_school_id
      from public.courses course
      join public.academic_years academic_year
        on academic_year.id = new.academic_year_id
       and academic_year.school_id = course.school_id
      where course.id = new.course_id
        and course.academic_year_id = new.academic_year_id;

    else
      raise exception 'Unsupported academic-operation table: %.', tg_table_name
        using errcode = '23514';
  end case;

  if derived_school_id is null then
    raise exception 'Academic operation has no deterministic school context.'
      using errcode = '23514';
  end if;

  if new.school_id is not null
     and new.school_id is distinct from derived_school_id then
    raise exception 'Academic operation crosses school boundaries.'
      using errcode = '23514';
  end if;

  new.school_id := derived_school_id;
  return new;
end
$function$;

create trigger zz_partial_grades_school_context
before insert or update of student_id, teacher_id, subject_id, course_id, academic_year_id, school_id
on public.partial_grades
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_evaluation_criteria_school_context
before insert or update of teacher_id, course_id, subject_id, academic_year_id, school_id
on public.evaluation_criteria
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_quarter_final_grades_school_context
before insert or update of student_id, subject_id, teacher_id, course_id, academic_year_id, school_id
on public.quarter_final_grades
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_term_subject_grades_school_context
before insert or update of student_id, subject_id, teacher_id, course_id, academic_year_id, school_id
on public.term_subject_grades
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_evaluation_publications_school_context
before insert or update of course_id, academic_year_id, school_id
on public.evaluation_publications
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_annual_evaluation_weights_school_context
before insert or update of teacher_id, course_id, subject_id, academic_year_id, school_id
on public.annual_evaluation_weights
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_final_course_grades_school_context
before insert or update of student_id, subject_id, teacher_id, course_id, academic_year_id, school_id
on public.final_course_grades
for each row execute function public.set_and_validate_academic_operation_school();

create trigger zz_final_evaluation_publications_school_context
before insert or update of course_id, academic_year_id, school_id
on public.final_evaluation_publications
for each row execute function public.set_and_validate_academic_operation_school();

alter table public.partial_grades alter column school_id set not null;
alter table public.evaluation_criteria alter column school_id set not null;
alter table public.quarter_final_grades alter column school_id set not null;
alter table public.term_subject_grades alter column school_id set not null;
alter table public.evaluation_publications alter column school_id set not null;
alter table public.annual_evaluation_weights alter column school_id set not null;
alter table public.final_course_grades alter column school_id set not null;
alter table public.final_evaluation_publications alter column school_id set not null;

do $functional_postconditions$
declare
  baseline record;
  current_count bigint;
  current_hash text;
begin
  for baseline in select * from _039a_functional_baseline
  loop
    execute format(
      'select count(*), md5(coalesce(string_agg((to_jsonb(row_data) - ''school_id'')::text, ''|'' order by row_data.id::text), '''')) from public.%I row_data',
      baseline.table_name
    )
    into current_count, current_hash;

    if current_count <> baseline.row_count
       or current_hash is distinct from baseline.functional_hash then
      raise exception 'Migration 039A changed functional data in %.', baseline.table_name;
    end if;
  end loop;

  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'partial_grades',
        'evaluation_criteria',
        'quarter_final_grades',
        'term_subject_grades',
        'evaluation_publications',
        'annual_evaluation_weights',
        'final_course_grades',
        'final_evaluation_publications'
      )
      and column_name = 'school_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) <> 8 then
    raise exception 'Migration 039A did not require every academic-operation school_id.';
  end if;

  if (
    select count(*)
    from pg_trigger trigger_data
    join pg_class relation on relation.oid = trigger_data.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'partial_grades',
        'evaluation_criteria',
        'quarter_final_grades',
        'term_subject_grades',
        'evaluation_publications',
        'annual_evaluation_weights',
        'final_course_grades',
        'final_evaluation_publications'
      )
      and trigger_data.tgname like 'zz_%_school_context'
      and not trigger_data.tgisinternal
  ) <> 8 then
    raise exception 'Migration 039A is missing a structural school-context trigger.';
  end if;
end
$functional_postconditions$;

commit;
