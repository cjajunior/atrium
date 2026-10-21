"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { friendlyDatabaseError, type ActionState } from "@/lib/action-state";
import { requirePermission } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const newClient = z.object({
  name: z.string().trim().min(2, "Enter the company name.").max(80, "Keep the name under 80 characters."),
  contactEmail: z.union([z.email("Enter a valid email, or leave it empty."), z.literal("")]),
});

export async function addClient(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requirePermission("clients.manage");
  const parsed = newClient.safeParse({
    name: formData.get("name"),
    contactEmail: (formData.get("contactEmail") ?? "").toString().trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    workspace_id: viewer.workspace.id,
    name: parsed.data.name,
    contact_email: parsed.data.contactEmail || null,
  });

  if (error) return { error: friendlyDatabaseError(error.message, "The client couldn't be added. Try again.") };

  revalidatePath("/app", "layout");
  return { success: `${parsed.data.name} was added.` };
}
