-- Atrium: who can see and change what.
-- The app hides buttons people can't use, but these policies are the real rules:
-- they run inside Postgres for every query, whatever client sends it.

-- Helper functions live in the private schema (not exposed through the API) and run
-- as their owner, so policies can read memberships without recursive policy checks.

create function private.member_role_in(ws uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  where m.workspace_id = ws
    and m.user_id = (select auth.uid())
$$;

create function private.member_client_in(ws uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.client_id
  from public.memberships m
  where m.workspace_id = ws
    and m.user_id = (select auth.uid())
$$;

create function private.is_staff_in(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role in ('admin', 'team')
  )
$$;

create function private.is_admin_in(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
      and m.role = 'admin'
  )
$$;

create function private.workspace_plan(ws uuid)
returns public.plan_tier
language sql
stable
security definer
set search_path = ''
as $$
  select w.plan from public.workspaces w where w.id = ws
$$;

-- You can see your own profile, and the profiles of people you work with.
-- Client users only see agency staff and colleagues from their own company,
-- never people from other client companies.
create function private.can_see_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target = (select auth.uid())
    or exists (
      select 1
      from public.memberships me
      join public.memberships them on them.workspace_id = me.workspace_id
      where me.user_id = (select auth.uid())
        and them.user_id = target
        and (me.role <> 'client' or them.role <> 'client' or them.client_id = me.client_id)
    )
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;
revoke execute on all functions in schema private from public;
grant execute on function
  private.member_role_in(uuid),
  private.member_client_in(uuid),
  private.is_staff_in(uuid),
  private.is_admin_in(uuid),
  private.workspace_plan(uuid),
  private.can_see_profile(uuid)
to authenticated, service_role;

-- Table privileges: signed-out visitors get nothing, signed-in users can read
-- (rows are filtered by the policies below) and can only write specific columns.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate on all tables in schema public from authenticated;

grant update (name) on public.workspaces to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant insert (name, contact_email, workspace_id), update (name, contact_email), delete on public.clients to authenticated;
grant insert (workspace_id, user_id, role, client_id), update (role, client_id), delete on public.memberships to authenticated;
grant insert (workspace_id, client_id, name, status, progress, due_date), update (name, status, progress, due_date), delete on public.projects to authenticated;
grant insert (project_id, title, description, priority, status, assignee_id, created_by),
      update (title, description, status, priority, assignee_id),
      delete
  on public.tickets to authenticated;
grant insert (ticket_id, body, is_internal, author_id) on public.ticket_comments to authenticated;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.memberships enable row level security;
alter table public.projects enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.subscriptions enable row level security;

-- Workspaces
create policy "Members can view their workspace"
  on public.workspaces for select to authenticated
  using (private.member_role_in(id) is not null);

create policy "Admins can rename their workspace"
  on public.workspaces for update to authenticated
  using (private.is_admin_in(id))
  with check (private.is_admin_in(id));

-- Profiles
create policy "People can view profiles of the people they work with"
  on public.profiles for select to authenticated
  using (private.can_see_profile(id));

create policy "People can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Clients
create policy "Staff see every client, client users see their own company"
  on public.clients for select to authenticated
  using (private.is_staff_in(workspace_id) or id = private.member_client_in(workspace_id));

create policy "Admins can add clients"
  on public.clients for insert to authenticated
  with check (private.is_admin_in(workspace_id));

create policy "Admins can edit clients"
  on public.clients for update to authenticated
  using (private.is_admin_in(workspace_id))
  with check (private.is_admin_in(workspace_id));

create policy "Admins can remove clients"
  on public.clients for delete to authenticated
  using (private.is_admin_in(workspace_id));

-- Memberships
create policy "People see their own membership, staff see the whole workspace"
  on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff_in(workspace_id));

create policy "Admins can add members"
  on public.memberships for insert to authenticated
  with check (private.is_admin_in(workspace_id));

create policy "Admins can change other members' roles"
  on public.memberships for update to authenticated
  using (private.is_admin_in(workspace_id) and user_id <> (select auth.uid()))
  with check (private.is_admin_in(workspace_id));

create policy "Admins can remove other members"
  on public.memberships for delete to authenticated
  using (private.is_admin_in(workspace_id) and user_id <> (select auth.uid()));

-- Projects
create policy "Staff see every project, client users see their company's projects"
  on public.projects for select to authenticated
  using (private.is_staff_in(workspace_id) or client_id = private.member_client_in(workspace_id));

create policy "Admins can create projects"
  on public.projects for insert to authenticated
  with check (private.is_admin_in(workspace_id));

create policy "Staff can update projects"
  on public.projects for update to authenticated
  using (private.is_staff_in(workspace_id))
  with check (private.is_staff_in(workspace_id));

create policy "Admins can delete projects"
  on public.projects for delete to authenticated
  using (private.is_admin_in(workspace_id));

-- Requests (tickets)
create policy "Staff see every request, client users see their company's requests"
  on public.tickets for select to authenticated
  using (private.is_staff_in(workspace_id) or client_id = private.member_client_in(workspace_id));

create policy "Members can open requests on projects they can see"
  on public.tickets for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      private.is_staff_in(workspace_id)
      or (
        client_id = private.member_client_in(workspace_id)
        and status = 'open'
        and assignee_id is null
      )
    )
  );

create policy "Staff can update requests"
  on public.tickets for update to authenticated
  using (private.is_staff_in(workspace_id))
  with check (private.is_staff_in(workspace_id));

create policy "Admins can delete requests"
  on public.tickets for delete to authenticated
  using (private.is_admin_in(workspace_id));

-- Conversation on a request.
-- The ticket subqueries below are themselves filtered by the tickets policies,
-- so "exists" also means "this person is allowed to see that request".
create policy "Staff see every message, clients see the public ones on their requests"
  on public.ticket_comments for select to authenticated
  using (
    private.is_staff_in(workspace_id)
    or (
      not is_internal
      and exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id)
    )
  );

create policy "Members can reply on requests they can see; internal notes need staff and Pro"
  on public.ticket_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.tickets t where t.id = ticket_comments.ticket_id)
    and (
      not is_internal
      or (private.is_staff_in(workspace_id) and private.workspace_plan(workspace_id) = 'pro')
    )
  );

-- Billing details are for admins only. Writes come from the Stripe webhook (service role).
create policy "Admins can view their subscription"
  on public.subscriptions for select to authenticated
  using (private.is_admin_in(workspace_id));
