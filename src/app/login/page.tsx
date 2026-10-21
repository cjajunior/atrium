import type { Metadata } from "next";
import Link from "next/link";
import { DemoEntry } from "@/components/demo-entry";
import { Logo, Notice } from "@/components/ui";
import { safeNextPath } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  demo: "The demo accounts are being reset. Try again in a minute.",
  link: "That link has expired or was already used. Sign in, or create the account again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? safeNextPath(next) : undefined;
  const errorMessage = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-[2rem] leading-tight font-semibold" style={{ fontStretch: "88%" }}>
            Sign in to Atrium
          </h1>
          <p className="mt-2 mb-6 text-muted">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
              Create a workspace
            </Link>
            .
          </p>
          {errorMessage ? (
            <div className="mb-4">
              <Notice tone="warning">{errorMessage}</Notice>
            </div>
          ) : null}
          <LoginForm next={nextPath} />
        </div>
      </div>

      <div className="skylight flex items-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="font-display text-2xl font-semibold" style={{ fontStretch: "88%" }}>
            Just looking around?
          </h2>
          <p className="mt-2 mb-5 text-ink-2">
            Open the shared demo as one of three people and see how the same workspace looks to each of them.
          </p>
          <DemoEntry layout="stack" />
        </div>
      </div>
    </div>
  );
}
