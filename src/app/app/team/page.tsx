import type { Metadata } from "next";
import { PermissionMatrix } from "@/components/permission-matrix";
import { Avatar, PageHeader, Panel, PanelTitle, RoleBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { listMembers } from "@/lib/queries";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Team and access" };

export default async function TeamPage() {
  const viewer = await requirePermission("team.view");
  const supabase = await createClient();
  const members = await listMembers(supabase, viewer.workspace.id);

  return (
    <>
      <PageHeader
        title="Team and access"
        description="Everyone who can sign in to this workspace, and what their role lets them do."
      />
      <div className="grid gap-6">
        <Panel>
          <PanelTitle aside={`${members.length} ${members.length === 1 ? "person" : "people"}`}>People</PanelTitle>
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.person?.id ?? member.created_at} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <Avatar name={member.person?.full_name ?? "?"} role={member.role} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {member.person?.full_name ?? "Unknown"}
                    {member.person?.id === viewer.userId ? <span className="font-normal text-muted"> (you)</span> : null}
                  </p>
                  <p className="truncate text-sm text-muted">{member.person?.email}</p>
                </div>
                <RoleBadge role={member.role} company={member.company?.name} />
                <span className="w-32 text-right text-sm text-muted">Joined {formatDate(member.created_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <PanelTitle aside="Enforced by the database, not just this screen">What each role can do</PanelTitle>
          <div className="px-5 pb-2">
            <PermissionMatrix caption="Permissions by role" />
          </div>
        </Panel>
      </div>
    </>
  );
}
