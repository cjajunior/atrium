import type { Metadata } from "next";
import Link from "next/link";
import { Notice, PageHeader } from "@/components/ui";
import { listProjects } from "@/lib/queries";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { NewRequestForm } from "./new-request-form";

export const metadata: Metadata = { title: "New request" };

export default async function NewRequestPage({ searchParams }: PageProps<"/app/requests/new">) {
  const viewer = await requireViewer();
  const { project } = await searchParams;
  const supabase = await createClient();
  const projects = await listProjects(supabase);
  const isClient = viewer.role === "client";

  return (
    <>
      <Link href="/app/requests" className="mb-4 inline-block text-sm font-semibold text-muted hover:text-ink">
        Back to requests
      </Link>
      <PageHeader
        title="New request"
        description={
          isClient
            ? `Ask ${viewer.workspace.name} for a change, or tell them about a problem.`
            : "Log a request on behalf of a client, or something the team needs to do."
        }
      />
      {projects.length === 0 ? (
        <Notice>There are no projects to file a request under yet.</Notice>
      ) : (
        <NewRequestForm
          projects={projects.map((item) => ({ id: item.id, name: item.name, company: item.company.name }))}
          defaultProjectId={typeof project === "string" && projects.some((item) => item.id === project) ? project : undefined}
          showCompany={!isClient}
        />
      )}
    </>
  );
}
