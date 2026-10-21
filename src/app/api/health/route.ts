import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/config";
import type { Database } from "@/lib/database.types";

export const dynamic = "force-dynamic";

/**
 * Uptime check, also called once a day by a Vercel cron job (vercel.json).
 * A daily database query keeps a free Supabase project from being paused for inactivity.
 */
export async function GET() {
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("healthcheck");

  if (error || data !== true) {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
