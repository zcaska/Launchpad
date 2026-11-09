create table public.launchpad_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision uuid not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object')
);

alter table public.launchpad_workspaces enable row level security;

revoke all on table public.launchpad_workspaces from public, anon, authenticated;
grant select, insert on table public.launchpad_workspaces to authenticated;
grant update (revision, snapshot) on table public.launchpad_workspaces to authenticated;

create policy "Read own LaunchPAD workspace"
  on public.launchpad_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own LaunchPAD workspace"
  on public.launchpad_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Update own LaunchPAD workspace"
  on public.launchpad_workspaces for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
