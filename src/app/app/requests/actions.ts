"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { friendlyDatabaseError, type ActionState } from "@/lib/action-state";
import type { Database } from "@/lib/database.types";
import { can } from "@/lib/permissions";
import { PLANS } from "@/lib/plans";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type RequestInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type MessageInsert = Database["public"]["Tables"]["ticket_comments"]["Insert"];

const newRequest = z.object({
  projectId: z.uuid("Choose a project."),
  title: z
    .string()
    .trim()
    .min(3, "Give the request a short title (at least 3 characters).")
    .max(140, "Keep the title under 140 characters."),
  description: z.string().trim().max(4000, "Keep the details under 4,000 characters."),
  priority: z.enum(["low", "normal", "high"]),
});

export async function createRequest(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = newRequest.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    priority: formData.get("priority") ?? "normal",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  // workspace_id and client_id are filled in by the database from the project.
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority,
      created_by: viewer.userId,
    } as RequestInsert)
    .select("id")
    .single();

  if (error || !data) {
    return { error: friendlyDatabaseError(error?.message, "The request couldn't be saved. Try again.") };
  }

  revalidatePath("/app", "layout");
  redirect(`/app/requests/${data.id}`);
}

const reply = z.object({
  requestId: z.uuid(),
  body: z.string().trim().min(1, "Write a message first.").max(4000, "Keep the message under 4,000 characters."),
  internal: z.boolean(),
});

export async function addMessage(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  const parsed = reply.safeParse({
    requestId: formData.get("requestId"),
    body: formData.get("body"),
    internal: formData.get("internal") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (parsed.data.internal) {
    if (!can(viewer.role, "notes.internal")) return { error: "Only your agency's team can write internal notes." };
    if (!PLANS[viewer.workspace.plan].internalNotes) {
      return { error: "Internal notes are part of the Pro plan." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id: parsed.data.requestId,
    author_id: viewer.userId,
    body: parsed.data.body,
    is_internal: parsed.data.internal,
  } as MessageInsert);

  if (error) return { error: friendlyDatabaseError(error.message, "The message couldn't be sent. Try again.") };

  revalidatePath(`/app/requests/${parsed.data.requestId}`);
  return { success: parsed.data.internal ? "Internal note added." : "Message sent." };
}

const update = z.object({
  requestId: z.uuid(),
  status: z.enum(["open", "in_progress", "resolved"]),
  priority: z.enum(["low", "normal", "high"]),
  assigneeId: z.union([z.uuid(), z.literal("")]),
});

export async function updateRequest(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireViewer();
  if (!can(viewer.role, "requests.manage")) return { error: "Only your agency's team can change requests." };

  const parsed = update.safeParse({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") ?? "",
  });
  if (!parsed.success) return { error: "Choose a status, priority and assignee." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .update({
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignee_id: parsed.data.assigneeId || null,
    })
    .eq("id", parsed.data.requestId)
    .select("id");

  if (error) return { error: friendlyDatabaseError(error.message, "The changes couldn't be saved. Try again.") };
  if (!data?.length) return { error: "You don't have access to change this request." };

  revalidatePath("/app", "layout");
  return { success: "Changes saved." };
}
