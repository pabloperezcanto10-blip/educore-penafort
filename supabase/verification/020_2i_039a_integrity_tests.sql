-- SPRINT 20.2I - 039A structural integrity tests
-- STAGING ONLY. All fixtures are synthetic and rolled back.

begin;

create temporary table _039a_qa_context as
with roots as (
  select distinct on (school.id)
    school.id as school_id,
    school.slug,
    academic_year.id as academic_year_id,
    course.id as course_id,
    subject.id as subject_id,
    membership.user_id as teacher_id
  from public.schools school
  join public.academic_years academic_year
    on academic_year.school_id = school.id
  join public.courses course
    on course.school_id = school.id
   and course.academic_year_id = academic_year.id
  join public.course_subjects relation
    on relation.school_id = school.id
   and relation.academic_year_id = academic_year.id
   and relation.course_id = course.id
  join public.subjects subject
    on subject.id = relation.subject_id
   and subject.school_id = school.id
  join public.school_memberships membership
    on membership.school_id = school.id
   and membership.role = 'tutor'
   and membership.active = true
  where school.id in (
    '20f20000-0000-4000-8000-000000000001'::uuid,
    '20e10000-0000-4000-8000-000000000001'::uuid
  )
  order by school.id, academic_year.id, course.id, subject.id, membership.user_id
)
select
  case
    when school_id = '20f20000-0000-4000-8000-000000000001'::uuid then 'a'
    else 'b'
  end as slot,
  roots.*
from roots;

do $fixture_preconditions$
begin
  if (select count(*) from _039a_qa_context) <> 2
     or (select count(distinct slot) from _039a_qa_context) <> 2 then
    raise exception '039A integrity tests require one audited academic root in each staging tenant.';
  end if;
end
$fixture_preconditions$;

insert into public.teacher_assignments (
  id,
  teacher_id,
  subject_id,
  course_id,
  academic_year_id,
  school_id
)
select
  case slot
    when 'a' then '039a1000-0000-4000-8000-000000000001'::uuid
    else '039a1000-0000-4000-8000-000000000002'::uuid
  end,
  teacher_id,
  subject_id,
  course_id,
  academic_year_id,
  school_id
from _039a_qa_context;

insert into public.students (
  id,
  name,
  last_name,
  course_id,
  tutor_teacher_id,
  academic_year_id,
  school_id
)
select
  case slot
    when 'a' then '039a2000-0000-4000-8000-000000000001'::uuid
    else '039a2000-0000-4000-8000-000000000002'::uuid
  end,
  '039A QA',
  case slot when 'a' then 'Tenant A' else 'Tenant B' end,
  course_id,
  teacher_id,
  academic_year_id,
  school_id
from _039a_qa_context;

-- Valid writes omit school_id to exercise the current application contract.
insert into public.partial_grades (
  id, student_id, teacher_id, subject_id, course_id, academic_year_id,
  term, assessment_type, assessment_name, grade, visible_to_family
)
select
  '039a3000-0000-4000-8000-000000000001'::uuid,
  '039a2000-0000-4000-8000-000000000001'::uuid,
  teacher_id, subject_id, course_id, academic_year_id,
  '1', 'parcial', '039A QA assessment', 8.5, true
from _039a_qa_context where slot = 'a';

insert into public.evaluation_criteria (
  id, teacher_id, course_id, subject_id, academic_year_id,
  term, name, weight, criterion_type, visible_to_family
)
select
  '039a3100-0000-4000-8000-000000000001'::uuid,
  teacher_id, course_id, subject_id, academic_year_id,
  '1', '039A QA criterion', 100, 'parcial', true
from _039a_qa_context where slot = 'a';

insert into public.quarter_final_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term, calculated_grade, final_grade
)
select
  '039a3200-0000-4000-8000-000000000001'::uuid,
  '039a2000-0000-4000-8000-000000000001'::uuid,
  subject_id, teacher_id, course_id, academic_year_id,
  '1', 8.5, 9
from _039a_qa_context where slot = 'a';

insert into public.term_subject_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term, status
)
select
  '039a3300-0000-4000-8000-000000000001'::uuid,
  '039a2000-0000-4000-8000-000000000001'::uuid,
  subject_id, teacher_id, course_id, academic_year_id,
  '1', 'draft'
from _039a_qa_context where slot = 'a';

insert into public.evaluation_publications (
  id, course_id, academic_year_id, term, published
)
select
  '039a3400-0000-4000-8000-000000000001'::uuid,
  course_id, academic_year_id, '1', false
from _039a_qa_context where slot = 'a';

insert into public.annual_evaluation_weights (
  id, teacher_id, course_id, subject_id, academic_year_id,
  term1_weight, term2_weight, term3_weight
)
select
  '039a3500-0000-4000-8000-000000000001'::uuid,
  teacher_id, course_id, subject_id, academic_year_id,
  33.33, 33.33, 33.34
from _039a_qa_context where slot = 'a';

insert into public.final_course_grades (
  id, student_id, subject_id, teacher_id, course_id, academic_year_id,
  term1_weight, term2_weight, term3_weight, status
)
select
  '039a3600-0000-4000-8000-000000000001'::uuid,
  '039a2000-0000-4000-8000-000000000001'::uuid,
  subject_id, teacher_id, course_id, academic_year_id,
  33.33, 33.33, 33.34, 'draft'
from _039a_qa_context where slot = 'a';

insert into public.final_evaluation_publications (
  id, course_id, academic_year_id, published
)
select
  '039a3700-0000-4000-8000-000000000001'::uuid,
  course_id, academic_year_id, false
from _039a_qa_context where slot = 'a';

do $valid_context_assertions$
begin
  if exists (
    select 1
    from (
      select school_id from public.partial_grades
        where id = '039a3000-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.evaluation_criteria
        where id = '039a3100-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.quarter_final_grades
        where id = '039a3200-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.term_subject_grades
        where id = '039a3300-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.evaluation_publications
        where id = '039a3400-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.annual_evaluation_weights
        where id = '039a3500-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.final_course_grades
        where id = '039a3600-0000-4000-8000-000000000001'::uuid
      union all
      select school_id from public.final_evaluation_publications
        where id = '039a3700-0000-4000-8000-000000000001'::uuid
    ) inserted_rows
    where school_id <> '20f20000-0000-4000-8000-000000000001'::uuid
  ) then
    raise exception '039A valid-write test failed to derive the expected school.';
  end if;
end
$valid_context_assertions$;

do $negative_tests$
declare
  school_a record;
  school_b record;
begin
  select * into school_a from _039a_qa_context where slot = 'a';
  select * into school_b from _039a_qa_context where slot = 'b';

  begin
    insert into public.partial_grades (
      student_id, teacher_id, subject_id, course_id, academic_year_id,
      term, assessment_type, assessment_name, grade, school_id
    ) values (
      '039a2000-0000-4000-8000-000000000001'::uuid,
      school_b.teacher_id, school_b.subject_id, school_b.course_id,
      school_b.academic_year_id, '1', 'parcial', 'cross course', 5,
      school_b.school_id
    );
    raise exception 'Expected cross-course partial grade rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.partial_grades (
      student_id, teacher_id, subject_id, course_id, academic_year_id,
      term, assessment_type, assessment_name, grade, school_id
    ) values (
      '039a2000-0000-4000-8000-000000000001'::uuid,
      school_a.teacher_id, school_b.subject_id, school_a.course_id,
      school_a.academic_year_id, '1', 'parcial', 'cross subject', 5,
      school_a.school_id
    );
    raise exception 'Expected cross-subject partial grade rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.evaluation_criteria (
      teacher_id, course_id, subject_id, academic_year_id,
      term, name, weight, criterion_type, school_id
    ) values (
      school_a.teacher_id, school_a.course_id, school_b.subject_id,
      school_a.academic_year_id, '1', 'cross criterion', 10, 'parcial',
      school_a.school_id
    );
    raise exception 'Expected cross-school criterion rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.evaluation_publications (
      course_id, academic_year_id, term, published, school_id
    ) values (
      school_a.course_id, school_a.academic_year_id, '2', false,
      school_b.school_id
    );
    raise exception 'Expected cross-school publication rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.annual_evaluation_weights (
      teacher_id, course_id, subject_id, academic_year_id,
      term1_weight, term2_weight, term3_weight, school_id
    ) values (
      school_a.teacher_id, school_a.course_id, school_a.subject_id,
      school_b.academic_year_id, 33.33, 33.33, 33.34, school_a.school_id
    );
    raise exception 'Expected cross-year annual weight rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.final_course_grades (
      student_id, subject_id, teacher_id, course_id, academic_year_id,
      term1_weight, term2_weight, term3_weight, status, school_id
    ) values (
      '039a2000-0000-4000-8000-000000000002'::uuid,
      school_a.subject_id, school_a.teacher_id, school_a.course_id,
      school_a.academic_year_id, 33.33, 33.33, 33.34, 'draft',
      school_a.school_id
    );
    raise exception 'Expected cross-student final grade rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.final_evaluation_publications (
      course_id, academic_year_id, published, school_id
    ) values (
      school_a.course_id, school_a.academic_year_id, false,
      '039affff-0000-4000-8000-000000000001'::uuid
    );
    raise exception 'Expected nonexistent school rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    update public.partial_grades
    set school_id = school_b.school_id
    where id = '039a3000-0000-4000-8000-000000000001'::uuid;
    raise exception 'Expected school_id update rejection.';
  exception when check_violation or foreign_key_violation then
    null;
  end;

  begin
    insert into public.partial_grades (
      student_id, teacher_id, subject_id, course_id, academic_year_id,
      term, assessment_type, assessment_name, grade
    ) values (
      '039a2000-0000-4000-8000-000000000001'::uuid,
      school_a.teacher_id, school_a.subject_id, school_a.course_id,
      school_a.academic_year_id, '1', 'parcial', '039A QA assessment', 7
    );
    raise exception 'Expected same-tenant duplicate rejection.';
  exception when unique_violation then
    null;
  end;
end
$negative_tests$;

select '039A structural integrity tests passed; transaction will roll back.' as result;

rollback;
