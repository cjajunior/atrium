import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, Panel, PanelTitle } from "@/components/ui";
import { can } from "@/lib/permissions";
import { canAddClient, clientAllowance } from "@/lib/plans";
import { listClients } from "@/lib/queries";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AddClientForm } from "./add-client-form";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const viewer = await requirePermission("work.all");
  const supabase = await createClient();
  const clients = await listClients(supabase);
  const isAdmin = can(viewer.role, "clients.manage");
  const roomForMore = canAddClient(viewer.workspace.plan, clients.length);

  return (
    <>
      <PageHeader title="Clients" description={clientAllowance(viewer.workspace.plan, clients.length)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Panel>
          {clients.length === 0 ? (
            <EmptyState title="No clients yet">Add your first client to start a project for them.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {clients.map((client) => (
                <li key={client.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{client.name}</p>
                    <p className="text-sm text-muted">{client.contact_email ?? "No contact email"}</p>
                  </div>
                  <p className="text-sm text-muted">
                    {client.projectCount} {client.projectCount === 1 ? "project" : "projects"},{" "}
                    {client.openRequests} open {client.openRequests === 1 ? "request" : "requests"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {isAdmin ? (
          <Panel>
            <PanelTitle>Add a client</PanelTitle>
            <div className="p-5">
              {roomForMore ? (
                <AddClientForm />
              ) : (
                <Notice tone="warning">
                  The Free plan includes up to 3 clients.{" "}
                  <Link href="/app/billing" className="font-semibold underline underline-offset-4">
                    Upgrade to Pro
                  </Link>{" "}
                  to add more.
                </Notice>
              )}
            </div>
          </Panel>
        ) : (
          <Notice>Only admins can add clients.</Notice>
        )}
      </div>
    </>
  );
}
