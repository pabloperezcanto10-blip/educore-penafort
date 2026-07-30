-- Sprint 20.2H
-- Read-only preflight and future postflight counters.
-- Every anomaly count must be zero before implementing 039.

-- PRODUCTION READ-ONLY / STAGING
-- Null and orphan roots for student-owned academic operations.
with anomaly_counts as (
  select
    'partial_grades'::text as table_name,
    count(*) filter (
      where row_data.student_id is null
         or row_data.course_id is null
         or row_data.subject_id is null
         or row_data.academic_year_id is null
    )::bigint as null_roots,
    count(*) filter (
      where student.id is null
         or course.id is null
         or subject.id is null
         or academic_year.id is null
    )::bigint as orphan_roots
  from public.partial_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id

  union all

  select
    'quarter_final_grades',
    count(*) filter (
      where row_data.student_id is null
         or row_data.course_id is null
         or row_data.subject_id is null
         or row_data.academic_year_id is null
    ),
    count(*) filter (
      where student.id is null
         or course.id is null
         or subject.id is null
         or academic_year.id is null
    )
  from public.quarter_final_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id

  union all

  select
    'term_subject_grades',
    count(*) filter (
      where row_data.student_id is null
         or row_data.course_id is null
         or row_data.subject_id is null
         or row_data.academic_year_id is null
    ),
    count(*) filter (
      where student.id is null
         or course.id is null
         or subject.id is null
         or academic_year.id is null
    )
  from public.term_subject_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id

  union all

  select
    'final_course_grades',
    count(*) filter (
      where row_data.student_id is null
         or row_data.course_id is null
         or row_data.subject_id is null
         or row_data.academic_year_id is null
    ),
    count(*) filter (
      where student.id is null
         or course.id is null
         or subject.id is null
         or academic_year.id is null
    )
  from public.final_course_grades row_data
  left join public.students student on student.id = row_data.student_id
  left join public.courses course on course.id = row_data.course_id
  left join public.subjects subject on subject.id = row_data.subject_id
  left join public.academic_years academic_year
    on academic_year.id = row_data.academic_year_id
)
select *
from anomaly_counts
order by table_name;
-- Missing exact teacher assignments.
with assignment_counts as (
  select
    'partial_grades'::text as table_name,
    count(*)::bigint as missing_assignment
  from public.partial_grades row_data
  where not exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = row_data.teacher_id
      and assignment.course_id = row_data.course_id
      and assignment.subject_id = row_data.subject_id
      and assignment.academic_year_id = row_data.academic_year_id
  )
  union all
  select 'evaluation_criteria', count(*)
  from public.evaluation_criteria row_data
  where not exists (
    select 1 from public.teacher_assignments assignment
    where assignment.teacher_id = row_data.teacher_id
      and assignment.course_id = row_data.course_id
      and assignment.subject_id = row_data.subject_id
      and assignment.academic_year_id = row_data.academic_year_id
  )
  union all
  select 'quarter_final_grades', count(*)
  from public.quarter_final_grades row_data
  where not exists (
    select 1 from public.teacher_assignments assignment
    where assignment.teacher_id = row_data.teacher_id
      and assignment.course_id = row_data.course_id
      and assignment.subject_id = row_data.subject_id
      and assignment.academic_year_id = row_data.academic_year_id
  )
  union all
  select 'term_subject_grades', count(*)
  from public.term_subject_grades row_data
  where not exists (
    select 1 from public.teacher_assignments assignment
    where assignment.teacher_id = row_data.teacher_id
      and assignment.course_id = row_data.course_id
      and assignment.subject_id = row_data.subject_id
      and assignment.academic_year_id = row_data.academic_year_id
  )
  union all
  select 'annual_evaluation_weights', count(*)
  from public.annual_evaluation_weights row_data
  where not exists (
    select 1 from public.teacher_assignments assignment
    where assignment.teacher_id = row_data.teacher_id
      and assignment.course_id = row_data.course_id
      and assignment.subject_id = row_data.subject_id
      and assignment.academic_year_id = row_data.academic_year_id
  )
  union all
  select 'final_course_grades', count(*)
  from public.final_course_grades row_data
  where not exists (
    select 1 from public.teacher_assignments assignment
    where assignment.teacher_id = row_data.teacher_id
      and assignment.course_id = row_data.course_id
      and assignment.subject_id = row_data.subject_id
      and assignment.academic_year_id = row_data.academic_year_id
  )
)
select *
from assignment_counts
order by table_name;

-- Invalid publication metadata.
select
  'evaluation_publications' as table_name,
  count(*) filter (
    where published = true
      and (published_at is null or published_by is null)
  )::bigint as invalid_published_metadata
from public.evaluation_publications
union all
select
  'final_evaluation_publications',
  count(*) filter (
    where published = true
      and (published_at is null or published_by is null)
  )
from public.final_evaluation_publications;

-- Future tenant-unique conflicts. These groupings match the planned keys
-- except school_id, which does not exist before 039.
select 'partial_grades' as table_name, count(*)::bigint as conflicting_groups
from (
  select
    academic_year_id,
    student_id,
    subject_id,
    term,
    assessment_type,
    assessment_name
  from public.partial_grades
  group by
    academic_year_id,
    student_id,
    subject_id,
    term,
    assessment_type,
    assessment_name
  having count(*) > 1
) conflicts
union all
select 'evaluation_criteria', count(*)
from (
  select academic_year_id, teacher_id, course_id, subject_id, term, name
  from public.evaluation_criteria
  group by academic_year_id, teacher_id, course_id, subject_id, term, name
  having count(*) > 1
) conflicts
union all
select 'quarter_final_grades', count(*)
from (
  select
    academic_year_id,
    student_id,
    subject_id,
    teacher_id,
    course_id,
    term
  from public.quarter_final_grades
  group by
    academic_year_id,
    student_id,
    subject_id,
    teacher_id,
    course_id,
    term
  having count(*) > 1
) conflicts
union all
select 'term_subject_grades', count(*)
from (
  select academic_year_id, student_id, subject_id, term
  from public.term_subject_grades
  group by academic_year_id, student_id, subject_id, term
  having count(*) > 1
) conflicts
union all
select 'evaluation_publications', count(*)
from (
  select academic_year_id, course_id, term
  from public.evaluation_publications
  group by academic_year_id, course_id, term
  having count(*) > 1
) conflicts
union all
select 'annual_evaluation_weights', count(*)
from (
  select academic_year_id, teacher_id, course_id, subject_id
  from public.annual_evaluation_weights
  group by academic_year_id, teacher_id, course_id, subject_id
  having count(*) > 1
) conflicts
union all
select 'final_course_grades', count(*)
from (
  select academic_year_id, student_id, subject_id
  from public.final_course_grades
  group by academic_year_id, student_id, subject_id
  having count(*) > 1
) conflicts
union all
select 'final_evaluation_publications', count(*)
from (
  select academic_year_id, course_id
  from public.final_evaluation_publications
  group by academic_year_id, course_id
  having count(*) > 1
) conflicts
order by table_name;

-- FUTURE POSTFLIGHT
-- to_jsonb keeps this query parseable before the school_id column exists.
select 'partial_grades' as table_name,
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )::bigint as null_school_id
from public.partial_grades row_data
union all
select 'evaluation_criteria',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.evaluation_criteria row_data
union all
select 'quarter_final_grades',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.quarter_final_grades row_data
union all
select 'term_subject_grades',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.term_subject_grades row_data
union all
select 'evaluation_publications',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.evaluation_publications row_data
union all
select 'annual_evaluation_weights',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.annual_evaluation_weights row_data
union all
select 'final_course_grades',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.final_course_grades row_data
union all
select 'final_evaluation_publications',
  count(*) filter (
    where to_jsonb(row_data) ? 'school_id'
      and to_jsonb(row_data) ->> 'school_id' is null
  )
from public.final_evaluation_publications row_data
order by table_name;
