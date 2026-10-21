import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { planForStatus, snapshotSubscription } from "@/lib/billing";
import { dueLabel, initials, timeAgo } from "@/lib/format";
import { can, navigationFor } from "@/lib/permissions";
import { canAddClient, clientAllowance, FREE_CLIENT_LIMIT } from "@/lib/plans";

describe("permissions", () => {
  it("lets only admins manage billing and clients", () => {
    expect(can("admin", "billing.manage")).toBe(true);
    expect(can("team", "billing.manage")).toBe(false);
    expect(can("client", "clients.manage")).toBe(false);
  });

  it("keeps internal notes away from clients", () => {
    expect(can("team", "notes.internal")).toBe(true);
    expect(can("client", "notes.internal")).toBe(false);
  });

  it("builds a different navigation for each role", () => {
    const labels = (role: Parameters<typeof navigationFor>[0]) => navigationFor(role).map((item) => item.label);
    expect(labels("admin")).toEqual(["Overview", "Requests", "Projects", "Clients", "Team and access", "Billing"]);
    expect(labels("team")).toEqual(["Overview", "Requests", "Projects", "Clients"]);
    expect(labels("client")).toEqual(["Overview", "Requests", "Projects"]);
  });
});

describe("plans", () => {
  it("stops the Free plan at the client limit and never stops Pro", () => {
    expect(canAddClient("free", FREE_CLIENT_LIMIT - 1)).toBe(true);
    expect(canAddClient("free", FREE_CLIENT_LIMIT)).toBe(false);
    expect(canAddClient("pro", 500)).toBe(true);
    expect(clientAllowance("free", 2)).toBe("2 of 3 clients");
  });

  it("uses the same limit as the database trigger", () => {
    const dir = path.join(__dirname, "..", "supabase", "migrations");
    const billing = readdirSync(dir).find((file) => file.endsWith("_billing.sql"));
    const sql = readFileSync(path.join(dir, billing!), "utf8");
    expect(sql).toContain(`if client_count >= ${FREE_CLIENT_LIMIT} then`);
  });
});

describe("Stripe subscriptions", () => {
  const subscription = (overrides: Record<string, unknown>) =>
    ({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      cancel_at_period_end: false,
      metadata: { workspace_id: "ws_1" },
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: "price_pro" } }] },
      ...overrides,
    }) as unknown as Stripe.Subscription;

  it("maps statuses to plans", () => {
    expect(planForStatus("active")).toBe("pro");
    expect(planForStatus("trialing")).toBe("pro");
    expect(planForStatus("past_due")).toBe("free");
    expect(planForStatus("canceled")).toBe("free");
  });

  it("reads the billing period from subscription items (current Stripe API)", () => {
    expect(snapshotSubscription(subscription({}))).toEqual({
      workspaceId: "ws_1",
      customerId: "cus_123",
      subscriptionId: "sub_123",
      priceId: "price_pro",
      status: "active",
      currentPeriodEnd: new Date(1_800_000_000 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    });
  });

  it("still understands older payloads and expanded customers", () => {
    const snapshot = snapshotSubscription(
      subscription({
        customer: { id: "cus_expanded" },
        current_period_end: 1_700_000_000,
        items: { data: [{ price: { id: "price_pro" } }] },
        metadata: {},
      }),
    );
    expect(snapshot.customerId).toBe("cus_expanded");
    expect(snapshot.currentPeriodEnd).toBe(new Date(1_700_000_000 * 1000).toISOString());
    expect(snapshot.workspaceId).toBeNull();
  });
});

describe("formatting", () => {
  const now = new Date("2026-10-21T15:00:00Z");

  it("describes recent activity in plain words", () => {
    expect(timeAgo("2026-10-21T14:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-21T14:48:00Z", now)).toBe("12 minutes ago");
    expect(timeAgo("2026-10-21T12:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-20T10:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-10-17T10:00:00Z", now)).toBe("4 days ago");
  });

  it("counts days to a due date", () => {
    const today = new Date(2026, 9, 21);
    expect(dueLabel("2026-10-21", today)).toBe("Due today");
    expect(dueLabel("2026-10-22", today)).toBe("Due tomorrow");
    expect(dueLabel("2026-11-02", today)).toBe("Due in 12 days");
    expect(dueLabel("2026-10-19", today)).toBe("2 days late");
    expect(dueLabel(null, today)).toBeNull();
  });

  it("makes initials for avatars", () => {
    expect(initials("Clara Nunes")).toBe("CN");
    expect(initials("theo")).toBe("T");
  });
});
