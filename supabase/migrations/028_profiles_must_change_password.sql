alter table public.profiles
add column if not exists must_change_password boolean not null default false;

create index if not exists profiles_must_change_password_idx
on public.profiles (must_change_password);

drop policy if exists "profiles_user_select_own_password_flag" on public.profiles;
create policy "profiles_user_select_own_password_flag"
on public.profiles
for select
to authenticated
using (id = auth.uid());
