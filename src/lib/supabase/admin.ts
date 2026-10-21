import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import type { Database } from "@/lib/database.types";

/**
 * Server-only client with the secret key. It bypasses Row Level Security, so it is used
 * for exactly two things: saving the Stripe customer at checkout and applying Stripe
 * webhook events. Returns null when the key isn't configured.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secretKey) return null;

  return createClient<Database>(SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
