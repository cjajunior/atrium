import Link from "next/link";
import { dueLabel, PROJECT_STATUS_LABELS } from "@/lib/format";
import type { ProjectListItem } from "@/lib/queries";
import { EmptyState, ProgressBar } from "./ui";

export function ProjectList({ projects, showCompany }: { projects: ProjectListItem[]; showCompany: boolean }) {
  if (projects.length === 0) {
    return <EmptyState title="No projects yet">Projects your agency sets up will show here.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-line">
      {projects.map((project) => {
        const due = project.status === "done" ? "Delivered" : dueLabel(project.due_date);
        return (
          <li key={project.id} className="relative grid gap-3 px-5 py-4 hover:bg-mist/70 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
            <div className="min-w-0">
              <Link
                href={`/app/projects/${project.id}`}
                className="font-semibold after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none"
              >
                {project.name}
              </Link>
              <p className="text-sm text-muted">
                {showCompany ? <>{project.company.name}. </> : null}
                {PROJECT_STATUS_LABELS[project.status]}
                {due ? <>, {due.charAt(0).toLowerCase() + due.slice(1)}</> : null}
                {project.openRequests > 0 ? (
                  <>
                    . {project.openRequests} open {project.openRequests === 1 ? "request" : "requests"}
                  </>
                ) : null}
              </p>
            </div>
            <ProgressBar value={project.progress} label={`${project.name} progress`} />
          </li>
        );
      })}
    </ul>
  );
}
