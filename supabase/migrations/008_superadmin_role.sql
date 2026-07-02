do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    if not exists (
      select 1
      from pg_enum
      where enumlabel = 'superadmin'
        and enumtypid = 'public.app_role'::regtype
    ) then
      alter type public.app_role add value 'superadmin';
    end if;
  end if;
end $$;

create or replace function public.current_user_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = required_role
  );
$$;

grant execute on function public.current_user_has_role(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'family');

  if requested_role not in ('superadmin', 'director', 'tutor', 'family') then
    requested_role := 'family';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    requested_role::public.app_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_superadmin_select_all" on public.profiles;
create policy "profiles_superadmin_select_all"
on public.profiles
for select
to authenticated
using (public.current_user_has_role('superadmin'));

drop policy if exists "profiles_superadmin_update_all" on public.profiles;
create policy "profiles_superadmin_update_all"
on public.profiles
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

alter table public.students enable row level security;

drop policy if exists "students_superadmin_select_all" on public.students;
create policy "students_superadmin_select_all"
on public.students
for select
to authenticated
using (public.current_user_has_role('superadmin'));

drop policy if exists "students_superadmin_insert_all" on public.students;
create policy "students_superadmin_insert_all"
on public.students
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "students_superadmin_update_all" on public.students;
create policy "students_superadmin_update_all"
on public.students
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

alter table public.courses enable row level security;

drop policy if exists "courses_authenticated_select_all" on public.courses;
create policy "courses_authenticated_select_all"
on public.courses
for select
to authenticated
using (true);

drop policy if exists "courses_superadmin_insert_all" on public.courses;
create policy "courses_superadmin_insert_all"
on public.courses
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "courses_superadmin_update_all" on public.courses;
create policy "courses_superadmin_update_all"
on public.courses
for update
to authenticated
using (public.current_user_has_role('superadmin'))
with check (public.current_user_has_role('superadmin'));

alter table public.parent_students enable row level security;

drop policy if exists "parent_students_superadmin_select_all" on public.parent_students;
create policy "parent_students_superadmin_select_all"
on public.parent_students
for select
to authenticated
using (public.current_user_has_role('superadmin'));

drop policy if exists "parent_students_superadmin_insert_all" on public.parent_students;
create policy "parent_students_superadmin_insert_all"
on public.parent_students
for insert
to authenticated
with check (public.current_user_has_role('superadmin'));

drop policy if exists "parent_students_superadmin_delete_all" on public.parent_students;
create policy "parent_students_superadmin_delete_all"
on public.parent_students
for delete
to authenticated
using (public.current_user_has_role('superadmin'));
