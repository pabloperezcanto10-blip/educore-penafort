drop policy if exists "evaluation_criteria_teacher_delete_own" on public.evaluation_criteria;
create policy "evaluation_criteria_teacher_delete_own"
on public.evaluation_criteria
for delete
to authenticated
using (teacher_id = auth.uid());
