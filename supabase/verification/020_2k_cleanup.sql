-- SPRINT 20.2K targeted cleanup
-- STAGING ONLY. Safe to execute repeatedly.

begin;

delete from auth.users
where email like '20_2k_qa.%@example.test';

do $cleanup_check$
begin
  if exists (
    select 1
    from auth.users
    where email like '20_2k_qa.%@example.test'
  ) then
    raise exception '20.2K cleanup left synthetic Auth users.';
  end if;

  if exists (
    select 1
    from public.profiles
    where email like '20_2k_qa.%@example.test'
  ) then
    raise exception '20.2K cleanup left synthetic profiles.';
  end if;
end
$cleanup_check$;

commit;

select '20.2K targeted cleanup passed' as result;
