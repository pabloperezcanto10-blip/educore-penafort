create table if not exists public.annual_evaluation_weights (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  term1_weight numeric(5,2) not null default 33.33,
  term2_weight numeric(5,2) not null default 33.33,
  term3_weight numeric(5,2) not null default 33.34,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint annual_weights_sum_100 check ((term1_weight + term2_weight + term3_weight) = 100),
  constraint annual_weights_non_negative check (term1_weight >= 0 and term2_weight >= 0 and term3_weight >= 0),
  constraint annual_weights_unique unique (teacher_id, course_id, subject_id)
);

create table if not exists public.final_course_grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  term1_grade integer,
  term2_grade integer,
  term3_grade integer,
  term1_weight numeric(5,2) not null,
  term2_weight numeric(5,2) not null,
  term3_weight numeric(5,2) not null,
  calculated_grade numeric(4,2),
  final_grade integer,
  final_observation text,
  status text not null default 'draft' check (status in ('pending','draft','closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint final_course_grades_unique unique (student_id, subject_id)
);

create table if not exists public.final_evaluation_publications (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  published boolean not null default false,
  published_at timestamptz,
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint final_evaluation_publications_unique_course unique (course_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists annual_evaluation_weights_updated_at on public.annual_evaluation_weights;
create trigger annual_evaluation_weights_updated_at
before update on public.annual_evaluation_weights
for each row execute function public.set_updated_at();

drop trigger if exists final_course_grades_updated_at on public.final_course_grades;
create trigger final_course_grades_updated_at
before update on public.final_course_grades
for each row execute function public.set_updated_at();

drop trigger if exists final_evaluation_publications_updated_at on public.final_evaluation_publications;
create trigger final_evaluation_publications_updated_at
before update on public.final_evaluation_publications
for each row execute function public.set_updated_at();

alter table public.annual_evaluation_weights enable row level security;
alter table public.final_course_grades enable row level security;
alter table public.final_evaluation_publications enable row level security;

drop policy if exists "annual_weights_teacher_all_assigned" on public.annual_evaluation_weights;
create policy "annual_weights_teacher_all_assigned"
on public.annual_evaluation_weights
for all
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = annual_evaluation_weights.course_id
      and ta.subject_id = annual_evaluation_weights.subject_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = annual_evaluation_weights.course_id
      and ta.subject_id = annual_evaluation_weights.subject_id
  )
);

drop policy if exists "annual_weights_supervision_select" on public.annual_evaluation_weights;
create policy "annual_weights_supervision_select"
on public.annual_evaluation_weights
for select
to authenticated
using (public.current_user_has_role('director') or public.current_user_has_role('superadmin'));

drop policy if exists "final_course_grades_teacher_all_assigned" on public.final_course_grades;
create policy "final_course_grades_teacher_all_assigned"
on public.final_course_grades
for all
to authenticated
using (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = final_course_grades.course_id
      and ta.subject_id = final_course_grades.subject_id
  )
)
with check (
  teacher_id = auth.uid()
  and exists (
    select 1 from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = final_course_grades.course_id
      and ta.subject_id = final_course_grades.subject_id
  )
);

drop policy if exists "final_course_grades_supervision_select" on public.final_course_grades;
create policy "final_course_grades_supervision_select"
on public.final_course_grades
for select
to authenticated
using (public.current_user_has_role('director') or public.current_user_has_role('superadmin'));

drop policy if exists "final_course_grades_family_published_select" on public.final_course_grades;
create policy "final_course_grades_family_published_select"
on public.final_course_grades
for select
to authenticated
using (
  exists (
    select 1 from public.parent_students ps
    join public.final_evaluation_publications fep on fep.course_id = final_course_grades.course_id
    where ps.parent_id = auth.uid()
      and ps.student_id = final_course_grades.student_id
      and fep.published = true
  )
);

drop policy if exists "final_publications_supervision_all" on public.final_evaluation_publications;
create policy "final_publications_supervision_all"
on public.final_evaluation_publications
for all
to authenticated
using (public.current_user_has_role('director') or public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('director') or public.current_user_has_role('superadmin'));

drop policy if exists "final_publications_read_scoped" on public.final_evaluation_publications;
create policy "final_publications_read_scoped"
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
      select 1 from public.parent_students ps
      join public.students s on s.id = ps.student_id
      where ps.parent_id = auth.uid()
        and s.course_id = final_evaluation_publications.course_id
    )
  )
);
