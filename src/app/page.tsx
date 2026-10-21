import Link from "next/link";
import { DemoEntry } from "@/components/demo-entry";
import { PermissionMatrix } from "@/components/permission-matrix";
import { RolePreview } from "@/components/role-preview";
import { Logo } from "@/components/ui";
import { AUTHOR, REPOSITORY_URL } from "@/lib/config";

const POLICY_EXCERPT = `create policy "Staff see every request,
  client users see their company's requests"
  on public.tickets for select to authenticated
  using (
    private.is_staff_in(workspace_id)
    or client_id = private.member_client_in(workspace_id)
  );`;

const BILLING_STEPS = [
  { title: "The admin clicks Upgrade", body: "Atrium creates a Stripe customer for the workspace and opens Stripe Checkout." },
  { title: "Stripe takes the payment", body: "In this demo it's test mode: the card 4242 4242 4242 4242 always works, and nothing is charged." },
  { title: "A signed webhook arrives", body: "The signature is checked, and the latest subscription state is fetched from Stripe." },
  { title: "The plan switches in one transaction", body: "The subscription is stored and the workspace becomes Pro. Cancel later and it goes back to Free the same way." },
];

const STACK = [
  { name: "Next.js 16", detail: "App Router, server components, server actions" },
  { name: "Supabase", detail: "Auth, Postgres, Row Level Security, pg_cron" },
  { name: "Stripe", detail: "Checkout, billing portal, webhooks" },
  { name: "TypeScript", detail: "Types generated from the database schema" },
  { name: "Tailwind CSS", detail: "One small set of tokens for color and type" },
  { name: "Vitest + PGlite", detail: "Access rules tested against a real Postgres" },
];

export default function HomePage() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
          <Logo />
          <nav aria-label="Site" className="flex items-center gap-1 text-[0.95rem] sm:gap-2">
            <a href="#rules" className="hidden rounded-lg px-3 py-2 font-semibold text-ink-2 hover:text-ink sm:inline">
              How access works
            </a>
            <a href={REPOSITORY_URL} className="rounded-lg px-3 py-2 font-semibold text-ink-2 hover:text-ink">
              Source code
            </a>
            <Link href="/login" className="rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink-2">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="skylight">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-28 pb-16 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:pt-36 lg:pb-24">
            <div>
              <h1
                className="font-display text-[clamp(2.6rem,5.6vw,4.4rem)] leading-[0.98] font-bold tracking-[-0.02em] text-balance"
                style={{ fontStretch: "78%" }}
              >
                Your clients see their work. Your team sees everything.
              </h1>
              <p className="mt-6 max-w-xl text-lg text-ink-2">
                Atrium is a client portal for small agencies: projects, requests and billing in one place. Who sees what is
                decided by the database itself, not by hiding buttons.
              </p>
              <p className="mt-9 mb-3 font-semibold">Open the live demo as</p>
              <DemoEntry />
              <p className="mt-3 text-sm text-ink-2">Shared demo accounts, no sign-up. Everything resets every hour.</p>
            </div>
            <RolePreview />
          </div>
        </section>

        <section id="rules" className="border-b border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
            <div className="max-w-2xl">
              <h2 className="font-display text-[2.2rem] leading-tight font-semibold tracking-tight" style={{ fontStretch: "85%" }}>
                One set of rules, kept in Postgres
              </h2>
              <p className="mt-3 text-lg text-ink-2">
                Every page asks the database as the person who is signed in. Row Level Security filters each answer, so a
                client can&apos;t read another company&apos;s requests even by calling the API directly.
              </p>
            </div>
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
              <PermissionMatrix caption="What each role can do" />
              <figure>
                <pre className="overflow-x-auto rounded-xl bg-ink p-5 font-mono text-[0.85rem] leading-relaxed text-sky">
                  <code>{POLICY_EXCERPT}</code>
                </pre>
                <figcaption className="mt-3 text-[0.95rem] text-muted">
                  One of the policies in{" "}
                  <a href={`${REPOSITORY_URL}/tree/main/supabase/migrations`} className="font-semibold text-ink underline underline-offset-4">
                    supabase/migrations
                  </a>
                  . Automated tests sign in as each role against a real Postgres and check what comes back.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-20">
            <h2 className="max-w-2xl font-display text-[2.2rem] leading-tight font-semibold tracking-tight" style={{ fontStretch: "85%" }}>
              Upgrading to Pro, from click to plan change
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-ink-2">
              Free covers 3 clients. Pro removes the limit and turns on internal notes. Both limits are enforced by the
              database, so the only way to Pro is a confirmed Stripe subscription.
            </p>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BILLING_STEPS.map((step, index) => (
                <li key={step.title} className="border-t-2 border-ink pt-4">
                  <p className="font-display text-sm font-semibold text-muted">Step {index + 1}</p>
                  <p className="mt-1 font-semibold">{step.title}</p>
                  <p className="mt-1 text-[0.95rem] text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-paper">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:py-20">
            <div>
              <h2 className="font-display text-[2.2rem] leading-tight font-semibold tracking-tight" style={{ fontStretch: "85%" }}>
                What it&apos;s made of
              </h2>
              <p className="mt-3 text-lg text-ink-2">
                Built as a portfolio project by {AUTHOR.name}, a full-stack developer who fixes and builds React and
                Supabase apps for small businesses.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={AUTHOR.upwork} className="rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink-2">
                  Hire Claudio on Upwork
                </a>
                <a href={REPOSITORY_URL} className="rounded-lg border border-line-strong px-4 py-2 font-semibold hover:border-ink">
                  Read the code
                </a>
              </div>
            </div>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {STACK.map((item) => (
                <div key={item.name} className="border-l-2 border-sky-2 pl-4">
                  <dt className="font-semibold">{item.name}</dt>
                  <dd className="text-[0.95rem] text-muted">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted sm:px-8">
          <p>
            Atrium is a demo. Companies and people in it are made up.
          </p>
          <p className="flex gap-4">
            <a href={AUTHOR.github} className="hover:text-ink">
              GitHub
            </a>
            <a href={AUTHOR.upwork} className="hover:text-ink">
              Upwork
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
