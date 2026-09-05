create table if not exists public.dashboard_pending_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  pending_key text not null check (char_length(pending_key) between 3 and 180),
  source_version text not null check (char_length(source_version) between 1 and 120),
  reviewed_at timestamptz not null default now(),
  constraint dashboard_pending_reviews_user_school_key_version_unique
    unique (user_id, school_id, pending_key, source_version)
);

create index if not exists dashboard_pending_reviews_user_school_idx
on public.dashboard_pending_reviews (user_id, school_id, reviewed_at desc);

alter table public.dashboard_pending_reviews enable row level security;

drop policy if exists "dashboard_pending_reviews_select_own" on public.dashboard_pending_reviews;
create policy "dashboard_pending_reviews_select_own"
on public.dashboard_pending_reviews
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_school_member(school_id)
);

drop policy if exists "dashboard_pending_reviews_insert_own" on public.dashboard_pending_reviews;
create policy "dashboard_pending_reviews_insert_own"
on public.dashboard_pending_reviews
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_school_member(school_id)
);

drop policy if exists "dashboard_pending_reviews_delete_own" on public.dashboard_pending_reviews;
create policy "dashboard_pending_reviews_delete_own"
on public.dashboard_pending_reviews
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_school_member(school_id)
);

revoke all on table public.dashboard_pending_reviews from anon;
revoke all on table public.dashboard_pending_reviews from authenticated;
grant select, insert, delete on table public.dashboard_pending_reviews to authenticated;
