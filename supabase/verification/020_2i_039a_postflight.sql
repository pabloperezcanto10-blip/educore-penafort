-- SPRINT 20.2I - 039A structural postflight
-- Read-only. Run only after 039A is applied to staging.

do $structural_assertions$
declare
  target_tables constant text[] := array[
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
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(target_tables)
      and column_name = 'school_id'
      and data_type = 'uuid'
      and is_nullable = 'NO'
  ) <> 8 then
    raise exception '039A postflight: expected eight NOT NULL school_id columns.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any(target_tables)
      and column_name = 'school_id'
      and column_default is not null
  ) then
    raise exception '039A postflight: school_id must not have a tenant default.';
  end if;

  if (
    select count(*)
    from pg_constraint constraint_data
    join pg_class relation on relation.oid = constraint_data.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(target_tables)
      and constraint_data.contype = 'f'
      and constraint_data.conname like '%_school_%fkey'
  ) <> 40 then
    raise exception '039A postflight: expected forty tenant-aware foreign keys.';
  end if;

  if exists (
    select 1
    from pg_constraint constraint_data
    join pg_class relation on relation.oid = constraint_data.conrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(target_tables)
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
  ) then
    raise exception '039A postflight: a legacy root FK would make PostgREST ambiguous.';
  end if;

  if (
    select count(*)
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'partial_grades_id_school_id_uidx',
        'evaluation_criteria_id_school_id_uidx',
        'quarter_final_grades_id_school_id_uidx',
        'term_subject_grades_id_school_id_uidx',
        'evaluation_publications_id_school_id_uidx',
        'annual_evaluation_weights_id_school_id_uidx',
        'final_course_grades_id_school_id_uidx',
        'final_evaluation_publications_id_school_id_uidx',
        'partial_grades_school_assessment_uidx',
        'evaluation_criteria_school_name_uidx',
        'quarter_final_grades_school_term_uidx',
        'term_subject_grades_school_term_uidx',
        'evaluation_publications_school_term_uidx',
        'annual_weights_school_uidx',
        'final_course_grades_school_uidx',
        'final_publications_school_uidx',
        'partial_grades_school_lookup_idx',
        'partial_grades_school_student_idx',
        'evaluation_criteria_school_lookup_idx',
        'quarter_final_grades_school_lookup_idx',
        'term_subject_grades_school_lookup_idx',
        'term_subject_grades_school_student_idx',
        'evaluation_publications_school_lookup_idx',
        'final_course_grades_school_lookup_idx',
        'final_course_grades_school_student_idx',
        'final_evaluation_publications_school_lookup_idx'
      )
  ) <> 26 then
    raise exception '039A postflight: expected twenty-six tenant-aware indexes.';
  end if;

  if (
    select count(*)
    from pg_trigger trigger_data
    join pg_class relation on relation.oid = trigger_data.tgrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(target_tables)
      and trigger_data.tgname like 'zz_%_school_context'
      and not trigger_data.tgisinternal
      and trigger_data.tgenabled = 'O'
  ) <> 8 then
    raise exception '039A postflight: expected eight enabled structural triggers.';
  end if;

  if (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = any(target_tables)
  ) <> 38 then
    raise exception '039A postflight: the RLS policy count changed.';
  end if;

  if (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = any(target_tables)
  ) <> 224 then
    raise exception '039A postflight: the table grant count changed.';
  end if;
end
$structural_assertions$;

do $data_assertions$
begin
  if exists (select 1 from public.partial_grades where school_id is null)
     or exists (select 1 from public.evaluation_criteria where school_id is null)
     or exists (select 1 from public.quarter_final_grades where school_id is null)
     or exists (select 1 from public.term_subject_grades where school_id is null)
     or exists (select 1 from public.evaluation_publications where school_id is null)
     or exists (select 1 from public.annual_evaluation_weights where school_id is null)
     or exists (select 1 from public.final_course_grades where school_id is null)
     or exists (select 1 from public.final_evaluation_publications where school_id is null) then
    raise exception '039A postflight: an academic-operation row has null school_id.';
  end if;

  if exists (
    select 1
    from public.partial_grades row_data
    join public.students student on student.id = row_data.student_id
    join public.courses course on course.id = row_data.course_id
    join public.subjects subject on subject.id = row_data.subject_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from student.school_id
       or row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from subject.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) or exists (
    select 1
    from public.quarter_final_grades row_data
    join public.students student on student.id = row_data.student_id
    join public.courses course on course.id = row_data.course_id
    join public.subjects subject on subject.id = row_data.subject_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from student.school_id
       or row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from subject.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) or exists (
    select 1
    from public.term_subject_grades row_data
    join public.students student on student.id = row_data.student_id
    join public.courses course on course.id = row_data.course_id
    join public.subjects subject on subject.id = row_data.subject_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from student.school_id
       or row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from subject.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) or exists (
    select 1
    from public.final_course_grades row_data
    join public.students student on student.id = row_data.student_id
    join public.courses course on course.id = row_data.course_id
    join public.subjects subject on subject.id = row_data.subject_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from student.school_id
       or row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from subject.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) then
    raise exception '039A postflight: a student-owned row crosses schools.';
  end if;

  if exists (
    select 1
    from public.evaluation_criteria row_data
    join public.courses course on course.id = row_data.course_id
    join public.subjects subject on subject.id = row_data.subject_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from subject.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) or exists (
    select 1
    from public.annual_evaluation_weights row_data
    join public.courses course on course.id = row_data.course_id
    join public.subjects subject on subject.id = row_data.subject_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from subject.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) then
    raise exception '039A postflight: a teacher-owned row crosses schools.';
  end if;

  if exists (
    select 1
    from public.evaluation_publications row_data
    join public.courses course on course.id = row_data.course_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) or exists (
    select 1
    from public.final_evaluation_publications row_data
    join public.courses course on course.id = row_data.course_id
    join public.academic_years academic_year
      on academic_year.id = row_data.academic_year_id
    where row_data.school_id is distinct from course.school_id
       or row_data.school_id is distinct from academic_year.school_id
  ) then
    raise exception '039A postflight: a publication crosses schools.';
  end if;
end
$data_assertions$;

select 'annual_evaluation_weights' as table_name,
       count(*) as total_rows,
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid) as penafort_rows
from public.annual_evaluation_weights
union all
select 'evaluation_criteria', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.evaluation_criteria
union all
select 'evaluation_publications', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.evaluation_publications
union all
select 'final_course_grades', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.final_course_grades
union all
select 'final_evaluation_publications', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.final_evaluation_publications
union all
select 'partial_grades', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.partial_grades
union all
select 'quarter_final_grades', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.quarter_final_grades
union all
select 'term_subject_grades', count(*),
       count(*) filter (where school_id = '20f20000-0000-4000-8000-000000000001'::uuid)
from public.term_subject_grades
order by table_name;

select
  (select count(*) from public.partial_grades where visible_to_family) as visible_partial_grades,
  (select count(*) from public.partial_grades where not visible_to_family) as hidden_partial_grades,
  (select count(*) from public.evaluation_criteria where visible_to_family) as visible_criteria,
  (select count(*) from public.evaluation_criteria where not visible_to_family) as hidden_criteria,
  (select count(*) from public.evaluation_publications where published) as term_publications,
  (select count(*) from public.final_evaluation_publications where published) as final_publications;
