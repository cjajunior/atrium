import type { Metadata } from "next";
import { ProjectList } from "@/components/project-list";
import { PageHeader, Panel, PanelTitle } from "@/components/ui";
import { listProjects } from "@/lib/queries";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const projects = await listProjects(supabase);

  if (viewer.role === "client") {
    return (
      <>
        <PageHeader title="Projects" description={`What ${viewer.workspace.name} is working on for you.`} />
        <Panel>
          <ProjectList projects={projects} showCompany={false} />
        </Panel>
      </>
    );
  }

  const byCompany = new Map<string, typeof projects>();
  for (const project of projects) {
    const list = byCompany.get(project.company.name) ?? [];
    list.push(project);
    byCompany.set(project.company.name, list);
  }

  return (
    <>
      <PageHeader title="Projects" description="Every client project, soonest deadline first." />
      <div className="grid gap-6">
        {[...byCompany.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([company, list]) => (
            <Panel key={company}>
              <PanelTitle aside={`${list.length} ${list.length === 1 ? "project" : "projects"}`}>{company}</PanelTitle>
              <ProjectList projects={list} showCompany={false} />
            </Panel>
          ))}
        {projects.length === 0 ? (
          <Panel>
            <ProjectList projects={[]} showCompany />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
