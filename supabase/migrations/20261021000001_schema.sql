-- Atrium: core schema
-- A workspace is one agency. People join a workspace through a membership with a role:
--   admin  -> runs the agency account (clients, billing, team)
--   team   -> works on projects and requests
--   client -> belongs to one client company and only sees that company's work

create schema if not exists private;

create type public.member_role as enum ('admin', 'team', 'client');
create type public.plan_tier as enum ('free', 'pro');
create type public.project_status as enum ('planning', 'in_progress', 'review', 'done');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved');
create type public.ticket_priority as enum ('low', 'normal', 'high');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  plan public.plan_tier not null default 'free',
  stripe_customer_id text unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  contact_email text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now(),
  -- Lets other tables reference (client, workspace) together, so a row can never
  -- point at a client from a different workspace.
  unique (id, workspace_id)
);
create index clients_workspace_idx on public.clients (workspace_id);

create table public.memberships (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  client_id uuid,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade,
  -- Client users always belong to exactly one client company; staff never do.
  constraint memberships_client_link check ((role = 'client') = (client_id is not null))
);
create index memberships_user_idx on public.memberships (user_id);
create index memberships_client_idx on public.memberships (client_id, workspace_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid not null,
  name text not null check (char_length(name) between 2 and 120),
  status public.project_status not null default 'planning',
  progress smallint not null default 0 check (progress between 0 and 100),
  due_date date,
  created_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create index projects_workspace_idx on public.projects (workspace_id);
create index projects_client_idx on public.projects (client_id, workspace_id);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  -- workspace_id and client_id are copied from the project by a trigger,
  -- so a request can't be filed under somebody else's client.
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  created_by uuid references public.profiles (id) on delete set null,
  assignee_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (client_id, workspace_id) references public.clients (id, workspace_id) on delete cascade
);
create index tickets_workspace_idx on public.tickets (workspace_id, status);
create index tickets_client_idx on public.tickets (client_id, workspace_id);
create index tickets_project_idx on public.tickets (project_id);
create index tickets_assignee_idx on public.tickets (assignee_id);
create index tickets_created_by_idx on public.tickets (created_by);

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  -- Internal notes are only visible to the agency (admin and team).
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index ticket_comments_ticket_idx on public.ticket_comments (ticket_id, created_at);
create index ticket_comments_workspace_idx on public.ticket_comments (workspace_id);
create index ticket_comments_author_idx on public.ticket_comments (author_id);

-- One row per workspace, written only by the Stripe webhook (service role).
create table public.subscriptions (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

-- New sign-ups get a profile and their own workspace, where they are the admin.
-- Demo accounts (raw_user_meta_data.demo = true) only get a profile.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  display_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, display_name, new.email);

  if coalesce((new.raw_user_meta_data ->> 'demo')::boolean, false) then
    return new;
  end if;

  insert into public.workspaces (name)
  values (left(display_name || '''s agency', 80))
  returning id into new_workspace_id;

  insert into public.memberships (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'admin');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Requests inherit workspace and client from their project, assignees must be agency staff,
-- and updated_at stays current.
create function private.prepare_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent record;
  project_changed boolean := false;
begin
  if tg_op = 'INSERT' then
    project_changed := true;
  elsif new.project_id is distinct from old.project_id then
    project_changed := true;
  end if;

  if project_changed then
    select p.workspace_id, p.client_id into parent
    from public.projects p
    where p.id = new.project_id;

    if not found then
      raise exception 'Project % does not exist', new.project_id
        using errcode = 'foreign_key_violation';
    end if;

    new.workspace_id := parent.workspace_id;
    new.client_id := parent.client_id;
  end if;

  if new.assignee_id is not null and not exists (
    select 1 from public.memberships m
    where m.workspace_id = new.workspace_id
      and m.user_id = new.assignee_id
      and m.role in ('admin', 'team')
  ) then
    raise exception 'Requests can only be assigned to people on the agency team'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    new.updated_at := new.created_at;
  elsif new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create trigger tickets_prepare
  before insert or update on public.tickets
  for each row execute function private.prepare_ticket();

create function private.prepare_ticket_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select t.workspace_id into new.workspace_id
  from public.tickets t
  where t.id = new.ticket_id;

  if new.workspace_id is null then
    raise exception 'Request % does not exist', new.ticket_id
      using errcode = 'foreign_key_violation';
  end if;

  -- A new message counts as activity on the request.
  update public.tickets
  set updated_at = new.created_at
  where id = new.ticket_id
    and updated_at < new.created_at;

  return new;
end;
$$;

create trigger ticket_comments_prepare
  before insert on public.ticket_comments
  for each row execute function private.prepare_ticket_comment();
