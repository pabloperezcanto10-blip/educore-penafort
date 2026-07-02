alter table public.courses enable row level security;

drop policy if exists "courses_director_select_all" on public.courses;

create policy "courses_director_select_all"
on public.courses
for select
to authenticated
using (public.current_user_has_role('director'));
