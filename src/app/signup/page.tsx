import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create a workspace" };

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-10">
      <Logo />
      <div className="mx-auto my-auto w-full max-w-sm py-12">
        <h1 className="font-display text-[2rem] leading-tight font-semibold" style={{ fontStretch: "88%" }}>
          Create your agency workspace
        </h1>
        <p className="mt-2 mb-6 text-muted">
          You&apos;ll be its admin. It starts on the Free plan, with up to 3 clients. Already have an account?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>
          .
        </p>
        <SignupForm />
      </div>
    </div>
  );
}
