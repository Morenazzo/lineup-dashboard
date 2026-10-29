-- Lineup: who may open the dashboard.
--
-- Being signed in proves nothing: anyone can create a Supabase Auth user if signups
-- are open. Only a row in public.admins counts. public.is_admin() looks the signed-in
-- email up there, and the policies on public.lineup_docs call it.
--
-- Lineup is built for ONE admin. The table takes more than one email, but they all read and
-- write the same data: there is no per-user scoping.
--
-- After applying, add yourself (use the same email as ADMIN_EMAILS in .env.local):
--   insert into public.admins (email) values ('you@example.com');

create table public.admins (
  email      text primary key,
  created_at timestamptz not null default now(),
  constraint admins_email_is_lowercase check (email = lower(email))
);

alter table public.admins enable row level security;

-- public.admins has no policy on purpose: only the service_role and the owner can touch it.
revoke all on table public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
