alter table public.profiles
add column if not exists active boolean not null default true;

update public.profiles
set active = true
where active is null;

create index if not exists profiles_active_role_idx
on public.profiles (active, role);

create or replace function public.current_user_has_role(required_role text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = required_role
      and coalesce(p.active, true) = true
  );
$$;

grant execute on function public.current_user_has_role(text) to authenticated;
