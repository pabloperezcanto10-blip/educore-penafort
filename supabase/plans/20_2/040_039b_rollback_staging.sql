-- STAGING ONLY
-- MANUAL ROLLBACK FOR SPRINT 20.2J / MIGRATION 040
-- DO NOT APPLY TO PRODUCTION
--
-- Restores the audited pre-040 academic policies, table grants and function
-- EXECUTE grants. It intentionally preserves every 039A column, constraint,
-- index, trigger and academic row.

begin;

do $rollback_preconditions$
begin
  if (
    select count(*)
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
  ) <> 36 then
    raise exception 'Refusing 040 rollback: the expected 36-policy 039B inventory is not present.';
  end if;
end
$rollback_preconditions$;

do $drop_039b_policies$
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
$drop_039b_policies$;

-- partial_grades: audited pre-040 policies.
create policy partial_grades_teacher_select_assigned
on public.partial_grades
for select
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students student
    join public.teacher_assignments assignment
      on assignment.teacher_id = auth.uid()
     and assignment.course_id = student.course_id
     and assignment.subject_id = partial_grades.subject_id
    where student.id = partial_grades.student_id
      and student.course_id = partial_grades.course_id
  )
);

create policy partial_grades_teacher_insert_assigned
on public.partial_grades
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students student
    join public.teacher_assignments assignment
      on assignment.teacher_id = auth.uid()
     and assignment.course_id = student.course_id
     and assignment.subject_id = partial_grades.subject_id
    where student.id = partial_grades.student_id
      and student.course_id = partial_grades.course_id
  )
);

create policy partial_grades_teacher_update_assigned
on public.partial_grades
for update
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students student
    join public.teacher_assignments assignment
      on assignment.teacher_id = auth.uid()
     and assignment.course_id = student.course_id
     and assignment.subject_id = partial_grades.subject_id
    where student.id = partial_grades.student_id
      and student.course_id = partial_grades.course_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.students student
    join public.teacher_assignments assignment
      on assignment.teacher_id = auth.uid()
     and assignment.course_id = student.course_id
     and assignment.subject_id = partial_grades.subject_id
    where student.id = partial_grades.student_id
      and student.course_id = partial_grades.course_id
  )
);

create policy partial_grades_family_select_children_visible
on public.partial_grades
for select
to authenticated
using (
  visible_to_family = true
  and exists (
    select 1
    from public.parent_students relation
    where relation.parent_id = auth.uid()
      and relation.student_id = partial_grades.student_id
  )
);

create policy partial_grades_director_select_all
on public.partial_grades
for select
to authenticated
using (public.current_user_has_role('director'));

create policy partial_grades_superadmin_select_all
on public.partial_grades
for select
to authenticated
using (public.current_user_has_role('superadmin'));

-- evaluation_criteria: audited pre-040 policies.
create policy evaluation_criteria_teacher_select_own
on public.evaluation_criteria
for select
to authenticated
using (teacher_id = auth.uid());

create policy evaluation_criteria_teacher_insert_own
on public.evaluation_criteria
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = evaluation_criteria.course_id
      and assignment.subject_id = evaluation_criteria.subject_id
  )
);

create policy evaluation_criteria_teacher_update_own
on public.evaluation_criteria
for update
to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = evaluation_criteria.course_id
      and assignment.subject_id = evaluation_criteria.subject_id
  )
);

create policy evaluation_criteria_teacher_delete_own
on public.evaluation_criteria
for delete
to authenticated
using (teacher_id = auth.uid());

create policy evaluation_criteria_director_select_all
on public.evaluation_criteria
for select
to authenticated
using (public.current_user_has_role('director'));

create policy evaluation_criteria_superadmin_select_all
on public.evaluation_criteria
for select
to authenticated
using (public.current_user_has_role('superadmin'));

-- quarter_final_grades: audited pre-040 policies.
create policy quarter_final_grades_teacher_select_own
on public.quarter_final_grades
for select
to authenticated
using (teacher_id = auth.uid());

create policy quarter_final_grades_teacher_insert_own
on public.quarter_final_grades
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = quarter_final_grades.course_id
      and assignment.subject_id = quarter_final_grades.subject_id
  )
);

create policy quarter_final_grades_teacher_update_own
on public.quarter_final_grades
for update
to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = quarter_final_grades.course_id
      and assignment.subject_id = quarter_final_grades.subject_id
  )
);

create policy quarter_final_grades_director_select_all
on public.quarter_final_grades
for select
to authenticated
using (public.current_user_has_role('director'));

create policy quarter_final_grades_superadmin_select_all
on public.quarter_final_grades
for select
to authenticated
using (public.current_user_has_role('superadmin'));

-- term_subject_grades: audited pre-040 policies.
create policy term_subject_grades_teacher_select_assigned
on public.term_subject_grades
for select
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = term_subject_grades.course_id
      and assignment.subject_id = term_subject_grades.subject_id
  )
);

create policy term_subject_grades_teacher_insert_assigned
on public.term_subject_grades
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = term_subject_grades.course_id
      and assignment.subject_id = term_subject_grades.subject_id
  )
);

create policy term_subject_grades_teacher_update_assigned
on public.term_subject_grades
for update
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = term_subject_grades.course_id
      and assignment.subject_id = term_subject_grades.subject_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = term_subject_grades.course_id
      and assignment.subject_id = term_subject_grades.subject_id
  )
);

create policy term_subject_grades_family_select_published
on public.term_subject_grades
for select
to authenticated
using (
  status = 'closed'
  and exists (
    select 1
    from public.parent_students relation
    where relation.parent_id = auth.uid()
      and relation.student_id = term_subject_grades.student_id
  )
  and exists (
    select 1
    from public.evaluation_publications publication
    where publication.course_id = term_subject_grades.course_id
      and publication.term = term_subject_grades.term
      and publication.published = true
  )
);

create policy term_subject_grades_director_select_all
on public.term_subject_grades
for select
to authenticated
using (public.current_user_has_role('director'));

create policy term_subject_grades_superadmin_select_all
on public.term_subject_grades
for select
to authenticated
using (public.current_user_has_role('superadmin'));

-- evaluation_publications: audited pre-040 policies.
create policy evaluation_publications_director_select
on public.evaluation_publications
for select
to authenticated
using (public.current_user_has_role('director'));

create policy evaluation_publications_director_insert
on public.evaluation_publications
for insert
to authenticated
with check (public.current_user_has_role('director'));

create policy evaluation_publications_director_update
on public.evaluation_publications
for update
to authenticated
using (public.current_user_has_role('director'))
with check (public.current_user_has_role('director'));

create policy evaluation_publications_superadmin_select
on public.evaluation_publications
for select
to authenticated
using (public.current_user_has_role('superadmin'));

create policy evaluation_publications_superadmin_insert
on public.evaluation_publications
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

create policy evaluation_publications_superadmin_update
on public.evaluation_publications
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

create policy evaluation_publications_tutor_select
on public.evaluation_publications
for select
to authenticated
using (
  public.current_user_has_role('tutor')
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = evaluation_publications.course_id
  )
);

create policy evaluation_publications_family_select_published
on public.evaluation_publications
for select
to authenticated
using (
  published = true
  and public.current_user_has_role('family')
  and exists (
    select 1
    from public.parent_students relation
    join public.students student on student.id = relation.student_id
    where relation.parent_id = auth.uid()
      and student.course_id = evaluation_publications.course_id
  )
);

-- annual_evaluation_weights: audited pre-040 policies.
create policy annual_weights_teacher_all_assigned
on public.annual_evaluation_weights
for all
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = annual_evaluation_weights.course_id
      and assignment.subject_id = annual_evaluation_weights.subject_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = annual_evaluation_weights.course_id
      and assignment.subject_id = annual_evaluation_weights.subject_id
  )
);

create policy annual_weights_supervision_select
on public.annual_evaluation_weights
for select
to authenticated
using (
  public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
);

-- final_course_grades: audited pre-040 policies.
create policy final_course_grades_teacher_all_assigned
on public.final_course_grades
for all
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = final_course_grades.course_id
      and assignment.subject_id = final_course_grades.subject_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_assignments assignment
    where assignment.teacher_id = auth.uid()
      and assignment.course_id = final_course_grades.course_id
      and assignment.subject_id = final_course_grades.subject_id
  )
);

create policy final_course_grades_family_published_select
on public.final_course_grades
for select
to authenticated
using (
  exists (
    select 1
    from public.parent_students relation
    join public.final_evaluation_publications publication
      on publication.course_id = final_course_grades.course_id
    where relation.parent_id = auth.uid()
      and relation.student_id = final_course_grades.student_id
      and publication.published = true
  )
);

create policy final_course_grades_supervision_select
on public.final_course_grades
for select
to authenticated
using (
  public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
);

-- final_evaluation_publications: audited pre-040 policies.
create policy final_publications_supervision_all
on public.final_evaluation_publications
for all
to authenticated
using (
  public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
)
with check (
  public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
);

create policy final_publications_read_scoped
on public.final_evaluation_publications
for select
to authenticated
using (
  public.current_user_has_role('tutor')
  or public.current_user_has_role('director')
  or public.current_user_has_role('superadmin')
  or (
    published = true
    and exists (
      select 1
      from public.parent_students relation
      join public.students student on student.id = relation.student_id
      where relation.parent_id = auth.uid()
        and student.course_id = final_evaluation_publications.course_id
    )
  )
);

-- Restore the exact Supabase default grants observed before 040.
grant select, insert, update, delete, truncate, references, trigger
  on table public.partial_grades to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.evaluation_criteria to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.quarter_final_grades to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.term_subject_grades to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.evaluation_publications to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.annual_evaluation_weights to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.final_course_grades to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on table public.final_evaluation_publications to anon, authenticated;

-- Restore the pre-040 function exposure exactly.
grant execute on function public.can_manage_school_configuration(uuid) to anon;
grant execute on function public.current_user_has_role(text) to public, anon;
grant execute on function public.handle_new_user() to public, anon;
grant execute on function public.has_school_role(uuid, public.app_role[]) to anon;
grant execute on function public.is_active_school_member(uuid) to anon;
grant execute on function public.set_and_validate_academic_operation_school() to public, anon;
grant execute on function public.set_and_validate_people_school_context() to anon;
grant execute on function public.user_has_active_school_role(uuid, uuid, public.app_role[]) to anon;

drop function if exists public.academic_family_can_read_publication(uuid, uuid, uuid, boolean);
drop function if exists public.academic_family_can_read_final(uuid, uuid, uuid, uuid, text);
drop function if exists public.academic_family_can_read_term(uuid, uuid, uuid, uuid, text, text);
drop function if exists public.academic_family_can_read_partial(uuid, uuid, boolean);
drop function if exists public.academic_is_valid_publication_actor(uuid, boolean, uuid, timestamptz);
drop function if exists public.academic_can_manage_publication(uuid);
drop function if exists public.academic_can_read_course(uuid, uuid, uuid);
drop function if exists public.academic_can_write_course_subject(uuid, uuid, uuid, uuid, uuid);
drop function if exists public.academic_can_read_course_subject(uuid, uuid, uuid, uuid, uuid);
drop function if exists public.academic_can_write_student_result(uuid, uuid, uuid, uuid, uuid, uuid);
drop function if exists public.academic_can_read_student_result(uuid, uuid, uuid, uuid, uuid, uuid);
drop function if exists public.academic_is_family(uuid);
drop function if exists public.academic_is_tutor(uuid);
drop function if exists public.academic_is_director(uuid);
drop function if exists public.academic_is_superadmin();
drop function if exists public.academic_school_is_active(uuid);

do $rollback_postconditions$
begin
  if (
    select count(*)
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
  ) <> 38 then
    raise exception '040 rollback failed: expected the legacy 38-policy inventory.';
  end if;

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
      and is_nullable = 'NO'
  ) <> 8 then
    raise exception '040 rollback changed a 039A school_id column.';
  end if;
end
$rollback_postconditions$;

commit;
