/** What a server action returns to its form: an error to show, or a short confirmation. */
export type ActionState = { error?: string; success?: string } | undefined;

/** Turns database errors into sentences people can act on. */
export function friendlyDatabaseError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  if (message.includes("row-level security")) return "You don't have access to do that here.";
  if (message.includes("permission denied")) return "You don't have access to do that here.";
  if (message.includes("Free plan includes up to")) return message;
  if (message.includes("only be assigned to people on the agency team")) {
    return "Requests can only be assigned to people on your team.";
  }
  return fallback;
}
