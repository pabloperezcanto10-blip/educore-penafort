-- Sprint 20.1: additive multitenant foundation.
-- This migration does not create a school, backfill operational data, or alter
-- existing tenant-unaware RLS policies.

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  slug text not null unique,
  status text not null default 'onboarding',
  active boolean not null default false,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  family_email_domain text,
  calendar_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schools_name_not_empty check (length(trim(name)) > 0),
  constraint schools_short_name_not_empty check (length(trim(short_name)) > 0),
  constraint schools_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  constraint schools_status_valid check (status in ('onboarding', 'active', 'suspended')),
  constraint schools_primary_color_valid check (
    primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint schools_secondary_color_valid check (
    secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint schools_accent_color_valid check (
    accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  constraint schools_family_email_domain_valid check (
    family_email_domain is null
    or (
      family_email_domain = lower(family_email_domain)
      and family_email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'
    )
  )
);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_memberships_user_school_role_unique unique (user_id, school_id, role)
);

create index if not exists schools_active_status_idx
on public.schools (active, status);

create index if not exists school_memberships_user_active_idx
on public.school_memberships (user_id, active);

create index if not exists school_memberships_school_active_idx
on public.school_memberships (school_id, active);

drop trigger if exists schools_set_updated_at on public.schools;
create trigger schools_set_updated_at
before update on public.schools
for each row
execute function public.set_updated_at();

drop trigger if exists school_memberships_set_updated_at on public.school_memberships;
create trigger school_memberships_set_updated_at
before update on public.school_memberships
for each row
execute function public.set_updated_at();

alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;

drop policy if exists "schools_select_active_memberships" on public.schools;
create policy "schools_select_active_memberships"
on public.schools
for select
to authenticated
using (
  exists (
    select 1
    from public.school_memberships membership
    where membership.school_id = schools.id
      and membership.user_id = auth.uid()
      and membership.active = true
  )
);

drop policy if exists "school_memberships_select_own" on public.school_memberships;
create policy "school_memberships_select_own"
on public.school_memberships
for select
to authenticated
using (user_id = auth.uid());

revoke all on table public.schools from anon;
revoke all on table public.school_memberships from anon;
revoke insert, update, delete, truncate, references, trigger on table public.schools from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.school_memberships from authenticated;
grant select on table public.schools to authenticated;
grant select on table public.school_memberships to authenticated;

-- Keep the legacy family role as a compatibility default, but never trust a
-- role supplied through public Auth metadata. Administrative flows explicitly
-- upsert the intended role from trusted server code.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'family'::public.app_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.id
    and not public.current_user_has_role('superadmin')
    and (
      new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.active is distinct from old.active
      or new.must_change_password is distinct from old.must_change_password
      or new.created_at is distinct from old.created_at
    )
  then
    raise exception 'Profile field is not editable by the current user.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;
create trigger profiles_protect_sensitive_fields
before update on public.profiles
for each row
execute function public.protect_profile_sensitive_fields();
