import type { Metadata } from "next";
import Link from "next/link";
import { RequestList } from "@/components/request-list";
import { ButtonLink, PageHeader, Panel } from "@/components/ui";
import { REQUEST_STATUS_LABELS, type RequestStatus } from "@/lib/format";
import { listRequests } from "@/lib/queries";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Requests" };

const TABS: { status: RequestStatus | null; label: string }[] = [
  { status: null, label: "All" },
  { status: "open", label: REQUEST_STATUS_LABELS.open },
  { status: "in_progress", label: REQUEST_STATUS_LABELS.in_progress },
  { status: "resolved", label: REQUEST_STATUS_LABELS.resolved },
];

function parseStatus(value: string | string[] | undefined): RequestStatus | null {
  return value === "open" || value === "in_progress" || value === "resolved" ? value : null;
}

export default async function RequestsPage({ searchParams }: PageProps<"/app/requests">) {
  const viewer = await requireViewer();
  const status = parseStatus((await searchParams).status);
  const supabase = await createClient();
  const all = await listRequests(supabase);
  const shown = status ? all.filter((request) => request.status === status) : all;
  const isClient = viewer.role === "client";

  return (
    <>
      <PageHeader
        title="Requests"
        description={
          isClient
            ? `Changes and problems you've raised with ${viewer.workspace.name}.`
            : "Everything your clients and your team have asked for."
        }
        actions={<ButtonLink href="/app/requests/new">New request</ButtonLink>}
      />

      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = tab.status ? all.filter((request) => request.status === tab.status).length : all.length;
          const active = tab.status === status;
          return (
            <Link
              key={tab.label}
              href={tab.status ? `/app/requests?status=${tab.status}` : "/app/requests"}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                active ? "border-ink bg-ink text-white" : "border-line-strong bg-paper text-ink-2 hover:border-ink"
              }`}
            >
              {tab.label} <span className={active ? "text-white/70" : "text-muted"}>{count}</span>
            </Link>
          );
        })}
      </nav>

      <Panel>
        <RequestList
          requests={shown}
          showCompany={!isClient}
          emptyTitle={status ? `No ${REQUEST_STATUS_LABELS[status].toLowerCase()} requests` : "No requests yet"}
          emptyHint={isClient ? "Use New request to ask for a change or report a problem." : undefined}
        />
      </Panel>
    </>
  );
}
