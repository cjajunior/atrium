import type Stripe from "stripe";
import type { Plan } from "./plans";

/** Subscription statuses that keep a workspace on Pro. Must match public.sync_subscription(). */
const PRO_STATUSES = new Set(["active", "trialing"]);

export function planForStatus(status: string): Plan {
  return PRO_STATUSES.has(status) ? "pro" : "free";
}

export type SubscriptionSnapshot = {
  workspaceId: string | null;
  customerId: string;
  subscriptionId: string;
  priceId: string | null;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

/**
 * Turns a Stripe subscription into the row we store. Newer Stripe API versions keep the
 * billing period on each subscription item; older ones kept it on the subscription.
 */
export function snapshotSubscription(subscription: Stripe.Subscription): SubscriptionSnapshot {
  const items = subscription.items?.data ?? [];
  const itemPeriodEnds = items
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number");
  const legacyPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const periodEnd = itemPeriodEnds.length > 0 ? Math.max(...itemPeriodEnds) : legacyPeriodEnd;

  return {
    workspaceId: subscription.metadata?.workspace_id || null,
    customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
    subscriptionId: subscription.id,
    priceId: items[0]?.price?.id ?? null,
    status: subscription.status,
    currentPeriodEnd: typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

/** The events the webhook listens to. Anything else is acknowledged and ignored. */
export const HANDLED_EVENTS = new Set<string>([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);
