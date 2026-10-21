import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, Panel, PriorityMark, RoleBadge, StatusBadge } from "@/components/ui";
import { formatDate, PRIORITY_LABELS, REQUEST_STATUS_LABELS, timeAgo } from "@/lib/format";
import { can, type Role } from "@/lib/permissions";
import { PLANS } from "@/lib/plans";
import { getRequest, listMembers, listMessages } from "@/lib/queries";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ReplyForm, RequestControls } from "./request-forms";

export const metadata: Metadata = { title: "Request" };

export default async function RequestPage({ params }: PageProps<"/app/requests/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const viewer = await requireViewer();
  const supabase = await createClient();
  const isStaff = can(viewer.role, "requests.manage");

  const [request, messages, members] = await Promise.all([
    getRequest(supabase, id),
    listMessages(supabase, id),
    isStaff ? listMembers(supabase, viewer.workspace.id) : Promise.resolve([]),
  ]);

  // Not found and "not yours" look the same on purpose: RLS returns nothing either way.
  if (!request) notFound();

  const roles = new Map<string, Role>(members.flatMap((member) => (member.person ? [[member.person.id, member.role]] : [])));
  const staff = members
    .filter((member) => member.role !== "client" && member.person)
    .map((member) => ({ id: member.person!.id, name: member.person!.full_name }));

  return (
    <>
      <Link href="/app/requests" className="mb-4 inline-block text-sm font-semibold text-muted hover:text-ink">
        Back to requests
      </Link>

      <header className="pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={request.status} />
          <PriorityMark priority={request.priority} />
        </div>
        <h1 className="mt-3 max-w-3xl font-display text-[2rem] leading-tight font-semibold tracking-tight" style={{ fontStretch: "90%" }}>
          {request.title}
        </h1>
        <p className="mt-1.5 text-muted">
          <Link href={`/app/projects/${request.project.id}`} className="font-semibold text-ink-2 hover:underline">
            {request.project.name}
          </Link>{" "}
          for {request.company.name}. Opened by {request.author?.full_name ?? "a former member"} on{" "}
          {formatDate(request.created_at)}.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="grid gap-6">
          <Panel className="px-5 py-4">
            <h2 className="sr-only">Details</h2>
            {request.description ? (
              <p className="whitespace-pre-line">{request.description}</p>
            ) : (
              <p className="text-muted">No details were added.</p>
            )}
          </Panel>

          <section aria-labelledby="conversation">
            <h2 id="conversation" className="mb-3 font-display text-xl font-semibold" style={{ fontStretch: "92%" }}>
              Conversation
            </h2>
            {messages.length === 0 ? (
              <p className="mb-4 text-muted">No replies yet.</p>
            ) : (
              <ol className="mb-4 grid gap-3">
                {messages.map((message) => {
                  const authorRole = message.author ? roles.get(message.author.id) : undefined;
                  return (
                    <li
                      key={message.id}
                      className={`rounded-xl border px-4 py-3 ${message.is_internal ? "internal-note border-progress/25" : "border-line bg-paper"}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Avatar name={message.author?.full_name ?? "?"} role={authorRole ?? null} size="sm" />
                        <span className="font-semibold">{message.author?.full_name ?? "Former member"}</span>
                        {authorRole ? <RoleBadge role={authorRole} /> : null}
                        <time dateTime={message.created_at} className="text-sm text-muted">
                          {timeAgo(message.created_at)}
                        </time>
                        {message.is_internal ? (
                          <span className="text-sm font-semibold text-progress">Internal note, hidden from the client</span>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-line">{message.body}</p>
                    </li>
                  );
                })}
              </ol>
            )}
            <ReplyForm
              requestId={request.id}
              canWriteInternal={can(viewer.role, "notes.internal")}
              internalNotesIncluded={PLANS[viewer.workspace.plan].internalNotes}
              isAdmin={viewer.role === "admin"}
            />
          </section>
        </div>

        <aside className="grid gap-4">
          {isStaff ? (
            <Panel className="p-5">
              <h2 className="mb-4 font-display text-lg font-semibold" style={{ fontStretch: "92%" }}>
                Manage
              </h2>
              <RequestControls
                requestId={request.id}
                status={request.status}
                priority={request.priority}
                assigneeId={request.assignee_id}
                staff={staff}
              />
            </Panel>
          ) : (
            <Panel className="p-5">
              <dl className="grid gap-3 text-[0.95rem]">
                <div>
                  <dt className="text-sm text-muted">Status</dt>
                  <dd className="font-semibold">{REQUEST_STATUS_LABELS[request.status]}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Priority</dt>
                  <dd className="font-semibold">{PRIORITY_LABELS[request.priority]}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Who&apos;s on it</dt>
                  <dd className="font-semibold">{request.assignee?.full_name ?? "Not assigned yet"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Last update</dt>
                  <dd className="font-semibold">{timeAgo(request.updated_at)}</dd>
                </div>
              </dl>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
