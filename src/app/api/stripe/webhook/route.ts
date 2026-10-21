import type Stripe from "stripe";
import { HANDLED_EVENTS, snapshotSubscription } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe calls this endpoint when a subscription starts, changes or ends.
 * The signature check proves the call came from Stripe; then the latest subscription
 * state is fetched from Stripe (events can arrive out of order) and stored in one
 * database transaction that also switches the workspace plan.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createAdminClient();
  if (!stripe || !webhookSecret || !admin) {
    return Response.json({ error: "Billing isn't configured on this deployment." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return Response.json({ received: true, ignored: event.type });
  }

  let subscriptionId: string | null = null;
  let workspaceHint: string | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription" || !session.subscription) {
      return Response.json({ received: true, ignored: "not a subscription checkout" });
    }
    subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    workspaceHint = session.metadata?.workspace_id ?? session.client_reference_id ?? null;
  } else {
    subscriptionId = (event.data.object as Stripe.Subscription).id;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const snapshot = snapshotSubscription(subscription);

  let workspaceId = snapshot.workspaceId ?? workspaceHint;
  if (!workspaceId) {
    const { data } = await admin
      .from("workspaces")
      .select("id")
      .eq("stripe_customer_id", snapshot.customerId)
      .maybeSingle();
    workspaceId = data?.id ?? null;
  }
  if (!workspaceId) return Response.json({ received: true, ignored: "no matching workspace" });

  const { data: plan, error } = await admin.rpc("sync_subscription", {
    p_workspace_id: workspaceId,
    p_customer_id: snapshot.customerId,
    p_subscription_id: snapshot.subscriptionId,
    p_price_id: snapshot.priceId as string,
    p_status: snapshot.status,
    p_current_period_end: snapshot.currentPeriodEnd as string,
    p_cancel_at_period_end: snapshot.cancelAtPeriodEnd,
  });

  if (error) {
    // The public demo workspace is rebuilt every hour; late events for an old copy are expected.
    if (error.message.includes("does not exist")) {
      return Response.json({ received: true, ignored: "workspace no longer exists" });
    }
    console.error("Stripe webhook: couldn't save the subscription", error.message);
    return Response.json({ error: "Couldn't save the subscription." }, { status: 500 });
  }

  return Response.json({ received: true, plan });
}
