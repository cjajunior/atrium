"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/session";
import { siteOrigin } from "@/lib/site";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function billingContext() {
  const viewer = await requirePermission("billing.manage");
  const stripe = getStripe();
  const admin = createAdminClient();
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !admin || !priceId) redirect("/app/billing?notice=not-configured");

  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, plan, stripe_customer_id")
    .eq("id", viewer.workspace.id)
    .single();
  if (!workspace) redirect("/app/billing?notice=not-configured");

  return { viewer, stripe, admin, priceId, workspace };
}

/** Sends the admin to Stripe Checkout to start the Pro subscription (test mode). */
export async function startCheckout() {
  const { viewer, stripe, admin, priceId, workspace } = await billingContext();
  if (workspace.plan === "pro") redirect("/app/billing");

  let customerId = workspace.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: workspace.name,
      email: viewer.email,
      metadata: { workspace_id: workspace.id },
    });
    await admin.rpc("attach_stripe_customer", { p_workspace_id: workspace.id, p_customer_id: customer.id });
    customerId = customer.id;
  }

  const origin = await siteOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: workspace.id,
    metadata: { workspace_id: workspace.id },
    subscription_data: { metadata: { workspace_id: workspace.id } },
    success_url: `${origin}/app/billing?checkout=success`,
    cancel_url: `${origin}/app/billing?checkout=cancelled`,
  });

  if (!session.url) redirect("/app/billing?notice=checkout-failed");
  redirect(session.url);
}

/** Opens Stripe's billing portal, where the admin can change the card or cancel. */
export async function openBillingPortal() {
  const { stripe, workspace } = await billingContext();
  if (!workspace.stripe_customer_id) redirect("/app/billing");

  const portal = await stripe.billingPortal.sessions.create({
    customer: workspace.stripe_customer_id,
    return_url: `${await siteOrigin()}/app/billing`,
  });
  redirect(portal.url);
}
