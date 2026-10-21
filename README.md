# Atrium

A client portal for small agencies: projects, requests and billing in one place, with three roles (admin, team, client) whose access is enforced by Postgres Row Level Security, and a Pro plan sold through Stripe.

**Live demo:** https://atrium-portal.vercel.app — open it as Ana (admin), Theo (team) or Clara (client). No sign-up; the demo rebuilds itself every hour.

Built by [Claudio Junior](https://www.upwork.com/freelancers/~016df2ab6710b2a9a1) as a portfolio project.

## What it shows

- **Role-based access done in the database.** Every query runs as the signed-in person, and RLS policies decide what comes back. A client user only ever receives their own company's projects and requests; internal notes never leave the database for them, even if they call the API directly.
- **Integrity rules the app can't bypass.** Requests take their workspace and client from the project (a client can't file a request under another company), only agency staff can be assigned, plan limits live in a trigger, and admins can't flip their own plan to Pro.
- **Stripe subscriptions.** Checkout, the billing portal, and a signed webhook that fetches the latest subscription and switches the plan in a single database transaction.
- **Tests against a real Postgres.** The access rules are tested by signing in as each role on an in-process Postgres ([PGlite](https://pglite.dev)) that runs the same migrations as production.

## The three roles

| | Admin | Team | Client |
|---|:-:|:-:|:-:|
| Open requests | ✓ | ✓ | ✓ |
| Change status, priority and assignee | ✓ | ✓ | |
| Read and write internal notes | ✓ | ✓ | |
| See every client's projects | ✓ | ✓ | |
| Add clients | ✓ | | |
| See who has access | ✓ | | |
| Manage the subscription | ✓ | | |

The table is generated from [`src/lib/permissions.ts`](src/lib/permissions.ts) inside the app. The interface uses it to decide what to show; the database enforces the same rules on its own in [`supabase/migrations`](supabase/migrations).

## How access works

```sql
create policy "Staff see every request, client users see their company's requests"
  on public.tickets for select to authenticated
  using (
    private.is_staff_in(workspace_id)
    or client_id = private.member_client_in(workspace_id)
  );
```

- Helper functions (`private.is_staff_in`, `private.member_client_in`, …) are `security definer` functions in a schema that isn't exposed through the API, so policies can read memberships without recursive policy checks and nobody can call them as RPCs.
- Table privileges are column-level: signed-in users can only write the columns a form needs. Signed-out visitors can't read any table.
- Composite foreign keys `(client_id, workspace_id)` make it impossible for a row to point at a client from another workspace.

## Billing flow

1. The admin clicks **Upgrade to Pro**. A Stripe customer is created for the workspace and Stripe Checkout opens.
2. Stripe takes the payment (test mode: card `4242 4242 4242 4242`, any future date, any CVC).
3. Stripe calls [`/api/stripe/webhook`](src/app/api/stripe/webhook/route.ts). The signature is verified and the latest subscription is fetched, since events can arrive out of order.
4. `public.sync_subscription()` stores the subscription and switches the workspace plan in one transaction. Only the service role can call it.

Free covers 3 clients; Pro removes the limit and turns on internal notes.

## Tech stack

- Next.js 16 (App Router, server components, server actions, `proxy.ts` for session refresh)
- Supabase: Auth, Postgres, Row Level Security, pg_cron (hourly demo reset)
- Stripe: Checkout, billing portal, webhooks
- TypeScript with types generated from the database schema
- Tailwind CSS 4
- Vitest and PGlite

## Project structure

```
supabase/
  migrations/      schema, access rules, billing, demo workspace, demo schedule
  seed.sql         the three demo accounts
src/
  proxy.ts         refreshes the session, sends signed-out visitors to /login
  lib/             config, permissions, plans, Stripe mapping, queries, session
  app/             pages, server actions and API routes
  components/      UI pieces
tests/
  access-rules.test.ts   RLS, grants and triggers, signed in as each role
  rules.test.ts          permissions, plans, Stripe mapping, formatting
```

## Running it locally

```bash
npm install
npm test          # 36 tests, no database or network needed
npm run dev       # uses the public demo project by default
```

To use your own Supabase project:

1. Run the files in `supabase/migrations` in order, then `supabase/seed.sql` (SQL editor, or `supabase db reset`).
2. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase, under Authentication → URL Configuration, set the Site URL to your deployment and add `<your-url>/auth/callback` to the redirect URLs, so sign-up confirmation links work.

## Turning on Stripe (test mode)

1. In the Stripe dashboard, in test mode, create a product "Atrium Pro" with a monthly price and copy its price ID.
2. Add a webhook endpoint pointing to `<your-url>/api/stripe/webhook` with the events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.
3. Set these environment variables on your deployment: `STRIPE_SECRET_KEY` (test key), `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` and `SUPABASE_SECRET_KEY`.

Without them, the app still runs and the billing page says which settings are missing. Live Stripe keys are refused on purpose.

## Keeping a free Supabase project awake

Free Supabase projects pause after a week without database activity. `vercel.json` schedules a daily call to [`/api/health`](src/app/api/health/route.ts), which runs a tiny query.

## License

MIT
