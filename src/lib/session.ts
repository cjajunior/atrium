import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission, type Role } from "@/lib/permissions";
import type { Plan } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  workspace: { id: string; name: string; plan: Plan; isDemo: boolean };
  /** The client company a client user belongs to. Null for agency staff. */
  company: { id: string; name: string } | null;
};

/**
 * Who is looking at the page, read once per request. Returns null when nobody is signed in,
 * or when the account isn't a member of any workspace.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
    supabase
      .from("memberships")
      .select("role, workspace:workspaces(id, name, plan, is_demo), company:clients(id, name)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || !membership?.workspace) return null;

  return {
    userId,
    name: profile.full_name || profile.email,
    email: profile.email,
    role: membership.role,
    workspace: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      plan: membership.workspace.plan,
      isDemo: membership.workspace.is_demo,
    },
    company: membership.company ? { id: membership.company.id, name: membership.company.name } : null,
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** For pages and actions that only some roles may use. Others are sent back to the overview. */
export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!can(viewer.role, permission)) redirect("/app?notice=no-access");
  return viewer;
}
