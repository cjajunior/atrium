import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-10">
      <Logo />
      <div className="mx-auto my-auto max-w-md py-16 text-center">
        <h1 className="font-display text-[2rem] leading-tight font-semibold" style={{ fontStretch: "88%" }}>
          This page isn&apos;t here
        </h1>
        <p className="mt-3 text-muted">
          It may have been removed, or it belongs to a client or workspace your account can&apos;t see.
        </p>
        <Link href="/app" className="mt-6 inline-block rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink-2">
          Go to your overview
        </Link>
      </div>
    </div>
  );
}
