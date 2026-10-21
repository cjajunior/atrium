import "server-only";
import Stripe from "stripe";

/**
 * Stripe is optional: without keys the app still runs and the billing page explains
 * what's missing. Live keys are refused because this project is a public demo.
 */
export function getStripe(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  if (!secretKey.startsWith("sk_test_") && !secretKey.startsWith("rk_test_")) {
    throw new Error("Atrium only runs Stripe in test mode. Use a test secret key (sk_test_...).");
  }
  return new Stripe(secretKey, { appInfo: { name: "Atrium", url: "https://github.com/cjajunior/atrium" } });
}

export type BillingSetup = {
  checkout: boolean;
  webhook: boolean;
  missing: string[];
};

/** Which billing pieces are configured on this deployment (names only, never values). */
export function billingSetup(): BillingSetup {
  const required = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([name]) => name);

  return {
    checkout: Boolean(required.STRIPE_SECRET_KEY && required.STRIPE_PRICE_ID && required.SUPABASE_SECRET_KEY),
    webhook: Boolean(required.STRIPE_WEBHOOK_SECRET && required.SUPABASE_SECRET_KEY),
    missing,
  };
}
