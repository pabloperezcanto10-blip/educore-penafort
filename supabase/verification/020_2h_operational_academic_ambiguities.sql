-- Sprint 20.2H
-- Read-only ambiguity checks.
-- All returned counts must be zero. No row identifiers or values are emitted.

-- PRODUCTION READ-ONLY / STAGING
-- Academic relation mismatches that do not require school_id.
with relation_checks as (
  select
    'partial_grades_student_course_year'::text as check_name,
    count(*)::bigint as anomaly_count
  from public.partial_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  where student.course_id <> row_data.course_id
     or student.academic_year_id <> row_data.academic_year_id
     or course.academic_year_id <> row_data.academic_year_id

  union all

  select 'quarter_final_grades_student_course_year', count(*)
  from public.quarter_final_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  where student.course_id <> row_data.course_id
     or student.academic_year_id <> row_data.academic_year_id
     or course.academic_year_id <> row_data.academic_year_id

  union all

  select 'term_subject_grades_student_course_year', count(*)
  from public.term_subject_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  where student.course_id <> row_data.course_id
     or student.academic_year_id <> row_data.academic_year_id
     or course.academic_year_id <> row_data.academic_year_id

  union all

  select 'final_course_grades_student_course_year', count(*)
  from public.final_course_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  where student.course_id <> row_data.course_id
     or student.academic_year_id <> row_data.academic_year_id
     or course.academic_year_id <> row_data.academic_year_id

  union all

  select 'evaluation_criteria_course_year', count(*)
  from public.evaluation_criteria row_data
  join public.courses course on course.id = row_data.course_id
  where course.academic_year_id <> row_data.academic_year_id

  union all

  select 'annual_weights_course_year', count(*)
  from public.annual_evaluation_weights row_data
  join public.courses course on course.id = row_data.course_id
  where course.academic_year_id <> row_data.academic_year_id

  union all

  select 'evaluation_publications_course_year', count(*)
  from public.evaluation_publications row_data
  join public.courses course on course.id = row_data.course_id
  where course.academic_year_id <> row_data.academic_year_id

  union all

  select 'final_publications_course_year', count(*)
  from public.final_evaluation_publications row_data
  join public.courses course on course.id = row_data.course_id
  where course.academic_year_id <> row_data.academic_year_id
)
select *
from relation_checks
order by check_name;

-- STAGING / FUTURE POSTFLIGHT
-- Tenant source contradictions. to_jsonb also permits safe execution against
-- the legacy production schema, where school_id keys are absent.
with tenant_source_checks as (
  select
    'partial_grades_tenant_sources'::text as check_name,
    count(*)::bigint as anomaly_count
  from public.partial_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  join public.subjects subject on subject.id = row_data.subject_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
  where (
      to_jsonb(student) ? 'school_id'
      and to_jsonb(course) ? 'school_id'
      and to_jsonb(subject) ? 'school_id'
      and to_jsonb(academic_year) ? 'school_id'
    )
    and (
      to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(course) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(subject) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(academic_year) ->> 'school_id'
    )

  union all

  select 'quarter_final_grades_tenant_sources', count(*)
  from public.quarter_final_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  join public.subjects subject on subject.id = row_data.subject_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
  where (
      to_jsonb(student) ? 'school_id'
      and to_jsonb(course) ? 'school_id'
      and to_jsonb(subject) ? 'school_id'
      and to_jsonb(academic_year) ? 'school_id'
    )
    and (
      to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(course) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(subject) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(academic_year) ->> 'school_id'
    )

  union all

  select 'term_subject_grades_tenant_sources', count(*)
  from public.term_subject_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  join public.subjects subject on subject.id = row_data.subject_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
  where (
      to_jsonb(student) ? 'school_id'
      and to_jsonb(course) ? 'school_id'
      and to_jsonb(subject) ? 'school_id'
      and to_jsonb(academic_year) ? 'school_id'
    )
    and (
      to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(course) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(subject) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(academic_year) ->> 'school_id'
    )

  union all

  select 'final_course_grades_tenant_sources', count(*)
  from public.final_course_grades row_data
  join public.students student on student.id = row_data.student_id
  join public.courses course on course.id = row_data.course_id
  join public.subjects subject on subject.id = row_data.subject_id
  join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
  where (
      to_jsonb(student) ? 'school_id'
      and to_jsonb(course) ? 'school_id'
      and to_jsonb(subject) ? 'school_id'
      and to_jsonb(academic_year) ? 'school_id'
    )
    and (
      to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(course) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(subject) ->> 'school_id'
      or to_jsonb(student) ->> 'school_id'
        is distinct from to_jsonb(academic_year) ->> 'school_id'
    )
)
select *
from tenant_source_checks
order by check_name;

-- Missing matching course-subject configuration.
select 'partial_grades' as table_name, count(*)::bigint as missing_course_subject
from public.partial_grades row_data
where not exists (
  select 1
  from public.course_subjects relation
  where relation.course_id = row_data.course_id
    and relation.subject_id = row_data.subject_id
    and relation.academic_year_id = row_data.academic_year_id
)
union all
select 'evaluation_criteria', count(*)
from public.evaluation_criteria row_data
where not exists (
  select 1 from public.course_subjects relation
  where relation.course_id = row_data.course_id
    and relation.subject_id = row_data.subject_id
    and relation.academic_year_id = row_data.academic_year_id
)
union all
select 'quarter_final_grades', count(*)
from public.quarter_final_grades row_data
where not exists (
  select 1 from public.course_subjects relation
  where relation.course_id = row_data.course_id
    and relation.subject_id = row_data.subject_id
    and relation.academic_year_id = row_data.academic_year_id
)
union all
select 'term_subject_grades', count(*)
from public.term_subject_grades row_data
where not exists (
  select 1 from public.course_subjects relation
  where relation.course_id = row_data.course_id
    and relation.subject_id = row_data.subject_id
    and relation.academic_year_id = row_data.academic_year_id
)
union all
select 'annual_evaluation_weights', count(*)
from public.annual_evaluation_weights row_data
where not exists (
  select 1 from public.course_subjects relation
  where relation.course_id = row_data.course_id
    and relation.subject_id = row_data.subject_id
    and relation.academic_year_id = row_data.academic_year_id
)
union all
select 'final_course_grades', count(*)
from public.final_course_grades row_data
where not exists (
  select 1 from public.course_subjects relation
  where relation.course_id = row_data.course_id
    and relation.subject_id = row_data.subject_id
    and relation.academic_year_id = row_data.academic_year_id
)
order by table_name;
