import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Every query below runs as the signed-in person. None of them filter by role:
// Row Level Security already returns only the rows that person may see.

const REQUEST_LIST_FIELDS =
  "id, title, status, priority, updated_at, created_at, project:projects(id, name), company:clients(id, name), assignee:profiles!tickets_assignee_id_fkey(id, full_name)";

export async function listRequests(
  supabase: Client,
  filters: { status?: "open" | "in_progress" | "resolved"; projectId?: string; assigneeId?: string | null; limit?: number } = {},
) {
  let query = supabase.from("tickets").select(REQUEST_LIST_FIELDS).order("updated_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.assigneeId === null) query = query.is("assignee_id", null);
  else if (filters.assigneeId) query = query.eq("assignee_id", filters.assigneeId);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load requests: ${error.message}`);
  return data;
}

export type RequestListItem = Awaited<ReturnType<typeof listRequests>>[number];

export async function getRequest(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, title, description, status, priority, created_at, updated_at, assignee_id, project:projects(id, name), company:clients(id, name), assignee:profiles!tickets_assignee_id_fkey(id, full_name), author:profiles!tickets_created_by_fkey(id, full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the request: ${error.message}`);
  return data;
}

export async function listMessages(supabase: Client, requestId: string) {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select("id, body, is_internal, created_at, author:profiles(id, full_name)")
    .eq("ticket_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Couldn't load the conversation: ${error.message}`);
  return data;
}

export async function listProjects(supabase: Client) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, progress, due_date, company:clients(id, name), tickets(status)")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Couldn't load projects: ${error.message}`);
  return data.map(({ tickets, ...project }) => ({
    ...project,
    openRequests: tickets.filter((ticket) => ticket.status !== "resolved").length,
  }));
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

export async function getProject(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, progress, due_date, created_at, company:clients(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Couldn't load the project: ${error.message}`);
  return data;
}

export async function listClients(supabase: Client) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, contact_email, created_at, projects(id), tickets(status)")
    .order("name");
  if (error) throw new Error(`Couldn't load clients: ${error.message}`);
  return data.map(({ projects, tickets, ...client }) => ({
    ...client,
    projectCount: projects.length,
    openRequests: tickets.filter((ticket) => ticket.status !== "resolved").length,
  }));
}

/** Everyone in the workspace. Only staff can read other people's memberships. */
export async function listMembers(supabase: Client, workspaceId: string) {
  const { data, error } = await supabase
    .from("memberships")
    .select("role, created_at, person:profiles(id, full_name, email), company:clients(id, name)")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) throw new Error(`Couldn't load the team: ${error.message}`);
  return data;
}

export async function listStaff(supabase: Client, workspaceId: string) {
  const members = await listMembers(supabase, workspaceId);
  return members
    .filter((member) => member.role !== "client" && member.person)
    .map((member) => ({ id: member.person!.id, name: member.person!.full_name, role: member.role }));
}
