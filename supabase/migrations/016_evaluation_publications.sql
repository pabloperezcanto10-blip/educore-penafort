create table if not exists public.evaluation_publications (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  term text not null check (term in ('1', '2', '3')),
  published boolean not null default false,
  published_at timestamptz,
  published_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evaluation_publications_unique_course_term unique (course_id, term),
  constraint evaluation_publications_published_requires_metadata check (
    published = false
    or (published_at is not null and published_by is not null)
  )
);

create index if not exists evaluation_publications_course_term_idx
on public.evaluation_publications (course_id, term, published);

create or replace function public.set_evaluation_publications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_evaluation_publications_updated_at on public.evaluation_publications;

create trigger set_evaluation_publications_updated_at
before update on public.evaluation_publications
for each row
execute function public.set_evaluation_publications_updated_at();

alter table public.evaluation_publications enable row level security;

drop policy if exists "evaluation_publications_director_select" on public.evaluation_publications;
create policy "evaluation_publications_director_select"
on public.evaluation_publications
for select
to authenticated
using (public.current_user_has_role('director'));

drop policy if exists "evaluation_publications_director_insert" on public.evaluation_publications;
create policy "evaluation_publications_director_insert"
on public.evaluation_publications
for insert
to authenticated
with check (public.current_user_has_role('director'));

drop policy if exists "evaluation_publications_director_update" on public.evaluation_publications;
create policy "evaluation_publications_director_update"
on public.evaluation_publications
for update
to authenticated
using (public.current_user_has_role('director'))
with check (public.current_user_has_role('director'));

drop policy if exists "evaluation_publications_superadmin_select" on public.evaluation_publications;
create policy "evaluation_publications_superadmin_select"
on public.evaluation_publications
for select
to authenticated
using (public.current_user_has_role('superadmin'));

drop policy if exists "evaluation_publications_superadmin_insert" on public.evaluation_publications;
create policy "evaluation_publications_superadmin_insert"
on public.evaluation_publications
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "evaluation_publications_superadmin_update" on public.evaluation_publications;
create policy "evaluation_publications_superadmin_update"
on public.evaluation_publications
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

drop policy if exists "evaluation_publications_tutor_select" on public.evaluation_publications;
create policy "evaluation_publications_tutor_select"
on public.evaluation_publications
for select
to authenticated
using (
  public.current_user_has_role('tutor')
  and exists (
    select 1
    from public.teacher_assignments ta
    where ta.teacher_id = auth.uid()
      and ta.course_id = evaluation_publications.course_id
  )
);

drop policy if exists "evaluation_publications_family_select_published" on public.evaluation_publications;
create policy "evaluation_publications_family_select_published"
on public.evaluation_publications
for select
to authenticated
using (
  published = true
  and public.current_user_has_role('family')
  and exists (
    select 1
    from public.parent_students ps
    join public.students s on s.id = ps.student_id
    where ps.parent_id = auth.uid()
      and s.course_id = evaluation_publications.course_id
  )
);
