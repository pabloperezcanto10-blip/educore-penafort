alter table public.notifications
add column if not exists status text not null default 'open';

alter table public.notifications
drop constraint if exists notifications_status_check;

alter table public.notifications
add constraint notifications_status_check
check (status in ('open', 'closed'));

create index if not exists notifications_status_created_idx
on public.notifications (status, created_at desc);
