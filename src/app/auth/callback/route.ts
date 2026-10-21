import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

/** Where the email confirmation link lands: turns the one-time code into a session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
