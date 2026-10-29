-- Lineup: the daily standup dashboard at /dashboard.
--
-- One generic document table, because the page keeps six small collections
-- (game, reports, weeks, tasks, chats, deals) and reads each one whole. Only a signed-in
-- admin (public.is_admin(), from the previous migration) can read or write it.
-- Nobody else gets a policy, so anon and any other signed-in user see nothing.

create table public.lineup_docs (
  coll       text        not null check (coll in ('game', 'reports', 'weeks', 'tasks', 'chats', 'deals')),
  id         text        not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  data       jsonb       not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (coll, id)
);

alter table public.lineup_docs enable row level security;

create policy lineup_docs_admin_all on public.lineup_docs
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.lineup_docs from anon, authenticated;
grant select, insert, update, delete on public.lineup_docs to authenticated;
