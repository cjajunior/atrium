-- Atrium: plans and Stripe subscriptions.
-- Free: up to 3 clients, no internal notes. Pro: unlimited clients and internal notes.
-- The limits are enforced here, not only in the interface.

create function private.enforce_client_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_plan public.plan_tier;
  client_count integer;
begin
  -- People who aren't admins can't add clients at all; let the access policy say so.
  if (select auth.uid()) is not null and not private.is_admin_in(new.workspace_id) then
    return new;
  end if;

  -- Lock the workspace row so two simultaneous inserts can't both slip under the limit.
  select w.plan into current_plan
  from public.workspaces w
  where w.id = new.workspace_id
  for update;

  if current_plan = 'free' then
    select count(*) into client_count
    from public.clients c
    where c.workspace_id = new.workspace_id;

    if client_count >= 3 then
      raise exception 'The Free plan includes up to 3 clients. Upgrade to Pro to add more.'
        using errcode = 'P0001', hint = 'plan_limit';
    end if;
  end if;

  return new;
end;
$$;

create trigger clients_enforce_plan_limit
  before insert on public.clients
  for each row execute function private.enforce_client_limit();

-- Called by the Stripe webhook with the service role key. It records the latest
-- subscription state and switches the workspace plan in one transaction.
create function public.sync_subscription(
  p_workspace_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_price_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns public.plan_tier
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_plan public.plan_tier :=
    case when p_status in ('active', 'trialing') then 'pro'::public.plan_tier
         else 'free'::public.plan_tier end;
begin
  insert into public.subscriptions as s (
    workspace_id, stripe_subscription_id, stripe_price_id, status,
    current_period_end, cancel_at_period_end, updated_at
  )
  values (
    p_workspace_id, p_subscription_id, p_price_id, p_status,
    p_current_period_end, p_cancel_at_period_end, now()
  )
  on conflict (workspace_id) do update
    set stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_price_id = excluded.stripe_price_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        updated_at = now();

  update public.workspaces
  set plan = next_plan,
      stripe_customer_id = coalesce(p_customer_id, stripe_customer_id)
  where id = p_workspace_id;

  if not found then
    raise exception 'Workspace % does not exist', p_workspace_id;
  end if;

  return next_plan;
end;
$$;

-- Saves the Stripe customer created at checkout. Service role only.
create function public.attach_stripe_customer(p_workspace_id uuid, p_customer_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.workspaces
  set stripe_customer_id = p_customer_id
  where id = p_workspace_id and stripe_customer_id is null
$$;

revoke execute on function public.sync_subscription(uuid, text, text, text, text, timestamptz, boolean) from public, anon, authenticated;
revoke execute on function public.attach_stripe_customer(uuid, text) from public, anon, authenticated;
grant execute on function public.sync_subscription(uuid, text, text, text, text, timestamptz, boolean) to service_role;
grant execute on function public.attach_stripe_customer(uuid, text) to service_role;
