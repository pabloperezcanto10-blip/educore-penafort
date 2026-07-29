-- DO NOT APPLY - DESIGN ONLY - SPRINT 20.2A
-- Reserved as migration 041 after the additive tutor RLS migration 038.
-- Proposed Wave 5b. Requires tenant-aware application queries first.

begin;

create or replace function public.is_active_school_member(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = auth.uid()
      and membership.school_id = p_school_id
      and membership.active
      and school.active
  );
$$;

create or replace function public.has_school_role(
  p_school_id uuid,
  p_roles public.app_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.school_memberships membership
    join public.schools school on school.id = membership.school_id
    where membership.user_id = auth.uid()
      and membership.school_id = p_school_id
      and membership.role = any(p_roles)
      and membership.active
      and school.active
  );
$$;

revoke all on function public.is_active_school_member(uuid) from public;
revoke all on function public.has_school_role(uuid, public.app_role[]) from public;
grant execute on function public.is_active_school_member(uuid) to authenticated;
grant execute on function public.has_school_role(uuid, public.app_role[]) to authenticated;

-- Configuration example. Before promotion, remove the previous global
-- authenticated/director/superadmin policies listed in the plan.
create policy academic_years_select_school_member
on public.academic_years
for select
to authenticated
using (public.is_active_school_member(school_id));

create policy academic_years_write_school_admin
on public.academic_years
for all
to authenticated
using (
  public.has_school_role(
    school_id,
    array['director', 'superadmin']::public.app_role[]
  )
)
with check (
  public.has_school_role(
    school_id,
    array['director', 'superadmin']::public.app_role[]
  )
);

-- The complete replacement set is defined table-by-table in
-- docs/PENAFORT_TENANT_BACKFILL_PLAN.md. Promotion is blocked until every old
-- global policy is mapped and the application uses an active school context.
-- This draft intentionally does not drop current policies.

commit;
