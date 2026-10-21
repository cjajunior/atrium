import type { Metadata } from "next";
import Link from "next/link";
import { ProjectList } from "@/components/project-list";
import { RequestList } from "@/components/request-list";
import { ButtonLink, Notice, PageHeader, Panel, PanelTitle } from "@/components/ui";
import { firstName } from "@/lib/format";
import { PLANS, clientAllowance } from "@/lib/plans";
import { listClients, listProjects, listRequests } from "@/lib/queries";
import { requireViewer, type Viewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: PageProps<"/app">) {
  const viewer = await requireViewer();
  const { notice } = await searchParams;

  return (
    <>
      {notice === "no-access" ? (
        <div className="mb-6">
          <Notice tone="warning">That page is only available to admins, so you were brought back here.</Notice>
        </div>
      ) : null}
      {viewer.role === "client" ? <ClientOverview viewer={viewer} /> : null}
      {viewer.role === "team" ? <TeamOverview viewer={viewer} /> : null}
      {viewer.role === "admin" ? <AdminOverview viewer={viewer} /> : null}
    </>
  );
}

async function ClientOverview({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const [projects, requests] = await Promise.all([listProjects(supabase), listRequests(supabase, { limit: 6 })]);

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName(viewer.name)}`}
        description={`Everything ${viewer.workspace.name} is doing for ${viewer.company?.name ?? "you"}, in one place.`}
        actions={<ButtonLink href="/app/requests/new">New request</ButtonLink>}
      />
      <div className="grid gap-6">
        <Panel>
          <PanelTitle>Your projects</PanelTitle>
          <ProjectList projects={projects} showCompany={false} />
        </Panel>
        <Panel>
          <PanelTitle aside={<Link href="/app/requests" className="font-semibold text-ink underline-offset-4 hover:underline">All requests</Link>}>
            Your requests
          </PanelTitle>
          <RequestList
            requests={requests}
            showCompany={false}
            emptyTitle="You haven't sent any requests yet"
            emptyHint="Use New request to ask for a change or report a problem."
          />
        </Panel>
      </div>
    </>
  );
}

async function TeamOverview({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const [mine, unassigned] = await Promise.all([
    listRequests(supabase, { assigneeId: viewer.userId }),
    listRequests(supabase, { assigneeId: null }),
  ]);
  const myOpen = mine.filter((request) => request.status !== "resolved");
  const waiting = unassigned.filter((request) => request.status !== "resolved");

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName(viewer.name)}`}
        description={
          myOpen.length === 0
            ? "Nothing is assigned to you right now."
            : `${myOpen.length} ${myOpen.length === 1 ? "request is" : "requests are"} assigned to you.`
        }
        actions={<ButtonLink href="/app/requests/new">New request</ButtonLink>}
      />
      <div className="grid gap-6">
        <Panel>
          <PanelTitle>Assigned to you</PanelTitle>
          <RequestList requests={myOpen} showCompany emptyTitle="You're all caught up" />
        </Panel>
        <Panel>
          <PanelTitle aside="Pick one up from the request page">Nobody assigned yet</PanelTitle>
          <RequestList requests={waiting} showCompany emptyTitle="Every request has an owner" />
        </Panel>
      </div>
    </>
  );
}

async function AdminOverview({ viewer }: { viewer: Viewer }) {
  const supabase = await createClient();
  const [requests, clients] = await Promise.all([listRequests(supabase), listClients(supabase)]);

  const open = requests.filter((request) => request.status === "open");
  const inProgress = requests.filter((request) => request.status === "in_progress");
  const needsAttention = requests.filter(
    (request) => request.status !== "resolved" && (request.priority === "high" || !request.assignee),
  );
  const plan = PLANS[viewer.workspace.plan];

  const figures = [
    { label: "Open requests", value: String(open.length), href: "/app/requests?status=open" },
    { label: "In progress", value: String(inProgress.length), href: "/app/requests?status=in_progress" },
    { label: "Clients", value: clientAllowance(viewer.workspace.plan, clients.length), href: "/app/clients" },
    { label: "Plan", value: plan.name, href: "/app/billing" },
  ];

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName(viewer.name)}`}
        description={`Here's how ${viewer.workspace.name} is doing today.`}
        actions={<ButtonLink href="/app/requests/new">New request</ButtonLink>}
      />

      <dl className="mb-6 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-paper md:grid-cols-4">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={`relative px-5 py-4 hover:bg-mist/70 ${index % 2 === 1 ? "border-l border-line" : ""} ${
              index > 1 ? "border-t border-line md:border-t-0" : ""
            } ${index === 2 ? "md:border-l" : ""}`}
          >
            <dt className="text-sm text-muted">{figure.label}</dt>
            <dd className="mt-0.5 font-display text-2xl font-semibold" style={{ fontStretch: "90%" }}>
              <Link href={figure.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
                {figure.value}
              </Link>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6">
        <Panel>
          <PanelTitle aside="High priority, or nobody assigned">Needs attention</PanelTitle>
          <RequestList requests={needsAttention} showCompany emptyTitle="Nothing urgent right now" />
        </Panel>
        <Panel>
          <PanelTitle aside={<Link href="/app/requests" className="font-semibold text-ink underline-offset-4 hover:underline">All requests</Link>}>
            Latest activity
          </PanelTitle>
          <RequestList requests={requests.slice(0, 5)} showCompany />
        </Panel>
      </div>
    </>
  );
}
