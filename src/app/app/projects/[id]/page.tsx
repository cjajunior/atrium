import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RequestList } from "@/components/request-list";
import { ButtonLink, PageHeader, Panel, PanelTitle, ProgressBar } from "@/components/ui";
import { dueLabel, formatDate, PROJECT_STATUS_LABELS } from "@/lib/format";
import { getProject, listRequests } from "@/lib/queries";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: PageProps<"/app/projects/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  await requireViewer();
  const supabase = await createClient();
  const [project, requests] = await Promise.all([
    getProject(supabase, id),
    listRequests(supabase, { projectId: id }),
  ]);
  if (!project) notFound();

  const due = project.status === "done" ? "Delivered" : dueLabel(project.due_date);

  return (
    <>
      <Link href="/app/projects" className="mb-4 inline-block text-sm font-semibold text-muted hover:text-ink">
        Back to projects
      </Link>
      <PageHeader
        title={project.name}
        description={`For ${project.company.name}. Started ${formatDate(project.created_at)}.`}
        actions={<ButtonLink href={`/app/requests/new?project=${project.id}`}>New request</ButtonLink>}
      />

      <Panel className="mb-6 grid gap-5 p-5 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted">Stage</p>
          <p className="font-semibold">{PROJECT_STATUS_LABELS[project.status]}</p>
        </div>
        <div>
          <p className="text-sm text-muted">Deadline</p>
          <p className="font-semibold">
            {project.due_date ? formatDate(`${project.due_date}T12:00:00`) : "Not set"}
            {due ? <span className="font-normal text-muted"> ({due.toLowerCase()})</span> : null}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted">Progress</p>
          <ProgressBar value={project.progress} label={`${project.name} progress`} />
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Requests on this project</PanelTitle>
        <RequestList requests={requests} showCompany={false} emptyTitle="No requests on this project yet" />
      </Panel>
    </>
  );
}
