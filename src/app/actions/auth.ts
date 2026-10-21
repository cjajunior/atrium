"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/config";
import { safeNextPath, siteOrigin } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

const credentials = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function signIn(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "That email and password don't match an account."
          : error.code === "email_not_confirmed"
            ? "Confirm your email first: open the link we sent you, then sign in."
            : "Signing in didn't work. Try again in a moment.",
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

const demoRole = z.enum(["admin", "team", "client"]);

/** Signs in to one of the three public demo accounts. Switching roles signs out first. */
export async function signInAsDemo(formData: FormData) {
  const role = demoRole.safeParse(formData.get("role"));
  if (!role.success) redirect("/login");

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS[role.data].email,
    password: DEMO_PASSWORD,
  });
  if (error) redirect("/login?error=demo");

  redirect("/app");
}

const signUpFields = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60, "Use 60 characters or fewer for your name."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

export async function signUp(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpFields.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "There's already an account with that email. Sign in instead."
          : error.code === "weak_password"
            ? "Choose a stronger password: at least 8 characters, not a common one."
            : "Creating the account didn't work. Try again in a moment.",
    };
  }

  if (!data.session) {
    return { success: "Check your inbox: open the confirmation link we sent, then sign in." };
  }

  redirect("/app");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
