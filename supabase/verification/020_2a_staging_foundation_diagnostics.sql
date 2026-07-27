-- Sprint 20.2A - staging-only foundation diagnostics.
-- READ ONLY. These tables are not present in production yet.

select 'schools' as entity, count(*)::bigint as total
from public.schools
union all
select 'school_memberships', count(*)
from public.school_memberships
union all
select 'active_schools', count(*)
from public.schools
where active
union all
select 'active_memberships', count(*)
from public.school_memberships
where active
union all
select 'inactive_memberships', count(*)
from public.school_memberships
where not active
union all
select 'membership_without_auth_user', count(*)
from public.school_memberships membership
left join auth.users user_row on user_row.id = membership.user_id
where user_row.id is null
union all
select 'membership_without_school', count(*)
from public.school_memberships membership
left join public.schools school on school.id = membership.school_id
where school.id is null
order by entity;
