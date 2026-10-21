import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { RequestListItem } from "@/lib/queries";
import { Avatar, EmptyState, PriorityMark, StatusBadge } from "./ui";

export function RequestList({
  requests,
  showCompany,
  emptyTitle = "No requests here",
  emptyHint,
}: {
  requests: RequestListItem[];
  showCompany: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (requests.length === 0) return <EmptyState title={emptyTitle}>{emptyHint}</EmptyState>;

  return (
    <ul className="divide-y divide-line">
      {requests.map((request) => (
        <li key={request.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-mist/70">
          <div className="min-w-0 flex-1 basis-64">
            <Link
              href={`/app/requests/${request.id}`}
              className="font-semibold after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none"
            >
              {request.title}
            </Link>
            <p className="truncate text-sm text-muted">
              {request.project.name}
              {showCompany ? <> for {request.company.name}</> : null}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PriorityMark priority={request.priority} quiet />
            <StatusBadge status={request.status} />
            {request.assignee ? (
              <span title={`Assigned to ${request.assignee.full_name}`} className="inline-flex">
                <Avatar name={request.assignee.full_name} size="sm" />
              </span>
            ) : (
              <span title="Nobody assigned yet" className="inline-grid size-6 place-items-center rounded-full border border-dashed border-line-strong" />
            )}
            <time dateTime={request.updated_at} className="w-28 text-right text-sm text-muted">
              {timeAgo(request.updated_at)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
