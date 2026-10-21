"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "role-admin" | "role-team" | "role-client";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-ink text-white hover:bg-ink-2",
    secondary: "border border-line-strong bg-paper text-ink hover:border-ink",
    "role-admin": "bg-admin text-white hover:bg-ink-2",
    "role-team": "bg-team text-white hover:brightness-110",
    "role-client": "bg-client text-white hover:brightness-110",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-[0.95rem] font-semibold transition disabled:cursor-progress disabled:opacity-70 ${styles} ${className}`}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm ${state.error ? "bg-danger-soft text-danger" : "bg-resolved-soft text-resolved"}`}
    >
      {state.error ?? state.success}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.95rem] font-semibold">{label}</span>
      {children}
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-[0.95rem] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none";
