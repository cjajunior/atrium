-- Atrium: the public demo workspace ("Brightside Studio", a small web agency).
-- Dates are relative to now(), so the demo never looks stale, and the whole
-- workspace is rebuilt every hour by private.reset_demo().

create function private.seed_demo_workspace()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
  admin_id uuid;
  team_id uuid;
  client_user_id uuid;
  northwind uuid;
  lumen uuid;
  casa uuid;
  p_site uuid;
  p_ordering uuid;
  p_portal uuid;
  p_shop uuid;
  t_menu uuid;
  t_hours uuid;
  t_logo uuid;
  t_pix uuid;
  t_email uuid;
  t_saturday uuid;
  t_images uuid;
begin
  select id into admin_id from public.profiles where email = 'demo-admin@example.com';
  select id into team_id from public.profiles where email = 'demo-team@example.com';
  select id into client_user_id from public.profiles where email = 'demo-client@example.com';

  if admin_id is null or team_id is null or client_user_id is null then
    raise exception 'Demo accounts are missing. Run supabase/seed.sql first.';
  end if;

  insert into public.workspaces (name, is_demo)
  values ('Brightside Studio', true)
  returning id into ws;

  insert into public.clients (workspace_id, name, contact_email, created_at)
  values (ws, 'Northwind Coffee', 'hello@northwind.example.com', now() - interval '60 days')
  returning id into northwind;
  insert into public.clients (workspace_id, name, contact_email, created_at)
  values (ws, 'Lumen Dental', 'office@lumendental.example.com', now() - interval '45 days')
  returning id into lumen;
  insert into public.clients (workspace_id, name, contact_email, created_at)
  values (ws, 'Casa Verde Plants', 'oi@casaverde.example.com', now() - interval '20 days')
  returning id into casa;

  insert into public.memberships (workspace_id, user_id, role, client_id)
  values
    (ws, admin_id, 'admin', null),
    (ws, team_id, 'team', null),
    (ws, client_user_id, 'client', northwind);

  insert into public.projects (workspace_id, client_id, name, status, progress, due_date, created_at)
  values (ws, northwind, 'Website redesign', 'in_progress', 65, current_date + 12, now() - interval '24 days')
  returning id into p_site;
  insert into public.projects (workspace_id, client_id, name, status, progress, due_date, created_at)
  values (ws, northwind, 'Online ordering', 'planning', 10, current_date + 40, now() - interval '6 days')
  returning id into p_ordering;
  insert into public.projects (workspace_id, client_id, name, status, progress, due_date, created_at)
  values (ws, lumen, 'Patient booking portal', 'review', 90, current_date + 4, now() - interval '41 days')
  returning id into p_portal;
  insert into public.projects (workspace_id, client_id, name, status, progress, due_date, created_at)
  values (ws, casa, 'Shopify migration', 'in_progress', 40, current_date + 21, now() - interval '15 days')
  returning id into p_shop;

  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_site, 'Menu prices on the homepage are out of date',
          'Our espresso and filter coffee prices changed on Monday, but the homepage still shows the old ones.',
          'open', 'high', client_user_id, team_id, now() - interval '3 hours')
  returning id into t_menu;
  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_site, 'Add the new store hours to the footer',
          'From next month we open at 7am on weekdays and close at 2pm on Sundays.',
          'in_progress', 'normal', client_user_id, team_id, now() - interval '2 days')
  returning id into t_hours;
  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_site, 'Logo looks blurry on phones',
          'On my iPhone the logo in the top bar looks soft compared to the rest of the page.',
          'resolved', 'normal', client_user_id, team_id, now() - interval '9 days')
  returning id into t_logo;
  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_ordering, 'Can customers pay with Pix?',
          'Most of our regulars pay with Pix at the counter. Can online orders accept it too?',
          'open', 'normal', client_user_id, null, now() - interval '1 day')
  returning id into t_pix;
  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_portal, 'Booking confirmation email shows the old address',
          'Patients are getting confirmations that point to the clinic''s previous address.',
          'in_progress', 'high', admin_id, team_id, now() - interval '5 hours')
  returning id into t_email;
  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_portal, 'Allow appointments on Saturday mornings',
          'Dr. Lima will see patients on Saturdays from 8am to noon starting next month.',
          'open', 'low', admin_id, null, now() - interval '3 days')
  returning id into t_saturday;
  insert into public.tickets (project_id, title, description, status, priority, created_by, assignee_id, created_at)
  values (p_shop, 'Product photos missing after the import',
          'About 40 products came over from the old store without their photos.',
          'open', 'high', team_id, team_id, now() - interval '20 hours')
  returning id into t_images;

  insert into public.ticket_comments (ticket_id, author_id, body, is_internal, created_at)
  values
    (t_menu, client_user_id, 'The new prices are on the board in the shop if that helps. I can also send a photo.', false, now() - interval '170 minutes'),
    (t_menu, team_id, 'Thanks, Clara! A photo would be perfect. I''ll update the homepage today and send you a preview link.', false, now() - interval '2 hours'),
    (t_menu, team_id, 'Prices are hard-coded in the homepage component. Let''s move them into the CMS so Clara can edit them herself.', true, now() - interval '110 minutes'),
    (t_hours, team_id, 'Footer updated on the staging site. Could you check that the Sunday hours are right?', false, now() - interval '1 day'),
    (t_logo, team_id, 'We replaced the logo with a sharper version made for high-resolution screens. It should look crisp now.', false, now() - interval '8 days'),
    (t_logo, client_user_id, 'Looks great, thank you!', false, now() - interval '8 days' + interval '2 hours'),
    (t_email, admin_id, 'The clinic asked us not to mention the old address anywhere, including old email templates.', true, now() - interval '4 hours'),
    (t_email, team_id, 'Found it: the address was in a template variable. Fix is ready for review.', false, now() - interval '1 hour'),
    (t_images, team_id, 'The old store exported image links that expired. Re-downloading them from the backup.', true, now() - interval '18 hours');

  return ws;
end;
$$;

-- Rebuilds the demo workspace and restores the demo accounts' names and passwords,
-- so whatever visitors change, the next visitor gets a clean demo.
create function private.reset_demo()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ws uuid;
begin
  delete from public.workspaces where is_demo;

  update public.profiles set full_name = case email
      when 'demo-admin@example.com' then 'Ana Ribeiro'
      when 'demo-team@example.com' then 'Theo Martins'
      when 'demo-client@example.com' then 'Clara Nunes'
    end
  where email in ('demo-admin@example.com', 'demo-team@example.com', 'demo-client@example.com');

  ws := private.seed_demo_workspace();

  if to_regprocedure('extensions.crypt(text, text)') is not null then
    execute $sql$
      update auth.users
      set encrypted_password = extensions.crypt('atrium-demo', extensions.gen_salt('bf'))
      where email in ('demo-admin@example.com', 'demo-team@example.com', 'demo-client@example.com')
    $sql$;
  end if;

  return ws;
end;
$$;

revoke execute on function private.seed_demo_workspace() from public;
revoke execute on function private.reset_demo() from public;

-- A cheap query for uptime checks. A daily call keeps a free Supabase project from pausing.
create function public.healthcheck()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true
$$;

grant execute on function public.healthcheck() to anon, authenticated;
