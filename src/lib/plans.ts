import type { Enums } from "./database.types";

export type Plan = Enums<"plan_tier">;

/** Must match private.enforce_client_limit() in supabase/migrations/*_billing.sql. */
export const FREE_CLIENT_LIMIT = 3;

export const PLANS: Record<Plan, { name: string; price: string; clientLimit: number | null; internalNotes: boolean }> = {
  free: { name: "Free", price: "$0", clientLimit: FREE_CLIENT_LIMIT, internalNotes: false },
  pro: { name: "Pro", price: "$19 / month", clientLimit: null, internalNotes: true },
};

export function canAddClient(plan: Plan, currentClients: number): boolean {
  const limit = PLANS[plan].clientLimit;
  return limit === null || currentClients < limit;
}

export function clientAllowance(plan: Plan, currentClients: number): string {
  const limit = PLANS[plan].clientLimit;
  if (limit === null) return `${currentClients} ${currentClients === 1 ? "client" : "clients"}`;
  return `${currentClients} of ${limit} clients`;
}
