import type { Metadata } from "next";
import { SubmitButton } from "@/components/form-controls";
import { Notice, PageHeader, Panel, PanelTitle } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { PLANS, type Plan } from "@/lib/plans";
import { requirePermission } from "@/lib/session";
import { billingSetup } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Billing" };

const FEATURES: { label: string; free: string; pro: string }[] = [
  { label: "Clients", free: "Up to 3", pro: "Unlimited" },
  { label: "Projects and requests", free: "Unlimited", pro: "Unlimited" },
  { label: "Internal notes for your team", free: "Not included", pro: "Included" },
];

export default async function BillingPage({ searchParams }: PageProps<"/app/billing">) {
  const viewer = await requirePermission("billing.manage");
  const { checkout, notice } = await searchParams;
  const supabase = await createClient();
  const [{ data: subscription }, { data: workspace }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end")
      .eq("workspace_id", viewer.workspace.id)
      .maybeSingle(),
    supabase.from("workspaces").select("stripe_customer_id").eq("id", viewer.workspace.id).single(),
  ]);

  const setup = billingSetup();
  const plan: Plan = viewer.workspace.plan;

  return (
    <>
      <PageHeader
        title="Billing"
        description={`${viewer.workspace.name} is on the ${PLANS[plan].name} plan.`}
      />

      <div className="mb-6 grid gap-3">
        {checkout === "success" ? (
          <Notice tone="success">
            Payment received. Pro switches on as soon as Stripe confirms the subscription, usually within a few seconds.
            Refresh this page if it still says Free.
          </Notice>
        ) : null}
        {checkout === "cancelled" ? <Notice>Checkout was cancelled. Nothing was charged.</Notice> : null}
        {notice === "not-configured" || !setup.checkout ? (
          <Notice tone="warning">
            Stripe isn&apos;t connected on this deployment yet, so upgrades are switched off. Missing settings:{" "}
            <span className="font-semibold">{setup.missing.join(", ")}</span>. The README explains where each one comes from.
          </Notice>
        ) : null}
        {viewer.workspace.isDemo && setup.checkout ? (
          <Notice>
            This is Stripe&apos;s test mode: nothing is charged. Pay with the card 4242 4242 4242 4242, any future expiry date and
            any CVC. The demo goes back to Free when it resets every hour.
          </Notice>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Panel>
          <PanelTitle>Plans</PanelTitle>
          <div className="overflow-x-auto px-5 pb-2">
            <table className="w-full min-w-[440px] border-collapse text-left text-[0.95rem]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-3 pr-4 font-semibold text-muted">
                    Included
                  </th>
                  {(["free", "pro"] as Plan[]).map((tier) => (
                    <th key={tier} scope="col" className="px-3 py-3">
                      <span className="block font-display text-lg font-semibold">{PLANS[tier].name}</span>
                      <span className="text-sm font-normal text-muted">{PLANS[tier].price}</span>
                      {tier === plan ? <span className="mt-1 block text-sm font-semibold text-team">Your plan</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature) => (
                  <tr key={feature.label} className="border-b border-line last:border-b-0">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      {feature.label}
                    </th>
                    <td className="px-3 py-3">{feature.free}</td>
                    <td className="px-3 py-3 font-semibold">{feature.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="font-display text-lg font-semibold">Subscription</h2>
          {subscription ? (
            <dl className="mt-3 grid gap-2 text-[0.95rem]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd className="font-semibold capitalize">{subscription.status.replace("_", " ")}</dd>
              </div>
              {subscription.current_period_end ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{subscription.cancel_at_period_end ? "Ends on" : "Renews on"}</dt>
                  <dd className="font-semibold">{formatDate(subscription.current_period_end)}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-muted">No paid subscription yet.</p>
          )}

          <div className="mt-5 grid gap-2">
            {plan === "free" && setup.checkout ? (
              <form action={startCheckout}>
                <SubmitButton className="w-full" pendingLabel="Opening Stripe…">
                  Upgrade to Pro
                </SubmitButton>
              </form>
            ) : null}
            {plan === "free" && !setup.checkout ? (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-lg bg-line px-4 py-2 text-[0.95rem] font-semibold text-muted"
              >
                Upgrade to Pro
              </button>
            ) : null}
            {workspace?.stripe_customer_id ? (
              <form action={openBillingPortal}>
                <SubmitButton variant="secondary" className="w-full" pendingLabel="Opening Stripe…">
                  Manage payment and invoices
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
