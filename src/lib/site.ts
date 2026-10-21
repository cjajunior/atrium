import "server-only";
import { headers } from "next/headers";

/** The public origin of this deployment, for links that leave the app (Stripe, email). */
export async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/** Only allow redirects to paths inside the app, never to other sites. */
export function safeNextPath(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string") return "/app";
  if (!value.startsWith("/app") || value.startsWith("//")) return "/app";
  return value;
}
