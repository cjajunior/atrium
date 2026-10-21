import Link from "next/link";
import type { ReactNode } from "react";
import {
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  initials,
  type ProjectStatus,
  type RequestPriority,
  type RequestStatus,
} from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "light" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="Atrium home">
      <span aria-hidden className="grid size-7 grid-cols-2 gap-[3px] rounded-[7px] bg-ink p-[5px]">
        <span className="rounded-[2px] bg-sky" />
        <span className="rounded-[2px] bg-sky/55" />
        <span className="rounded-[2px] bg-sky/55" />
        <span className="rounded-[2px] bg-sky/55" />
      </span>
      <span
        className={`font-display text-[1.35rem] font-semibold tracking-tight ${tone === "light" ? "text-white" : "text-ink"}`}
        style={{ fontStretch: "88%" }}
      >
        Atrium
      </span>
    </Link>
  );
}

const ROLE_STYLES: Record<Role, string> = {
  admin: "bg-admin-soft text-admin",
  team: "bg-team-soft text-team",
  client: "bg-client-soft text-client",
};

const ROLE_DOT: Record<Role, string> = {
  admin: "bg-admin",
  team: "bg-team",
  client: "bg-client",
};

export function RoleBadge({ role, company }: { role: Role; company?: string | null }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold ${ROLE_STYLES[role]}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${ROLE_DOT[role]}`} />
      {ROLE_LABELS[role]}
      {company ? <span className="font-normal opacity-80">at {company}</span> : null}
    </span>
  );
}

const STATUS_STYLES: Record<RequestStatus, string> = {
  open: "bg-open-soft text-open",
  in_progress: "bg-progress-soft text-progress",
  resolved: "bg-resolved-soft text-resolved",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {REQUEST_STATUS_LABELS[status]}
    </span>
  );
}

export function ProjectStatusLabel({ status }: { status: ProjectStatus }) {
  return <span className="text-sm text-muted">{PROJECT_STATUS_LABELS[status]}</span>;
}

export function PriorityMark({ priority, quiet = false }: { priority: RequestPriority; quiet?: boolean }) {
  if (priority === "normal" && quiet) return null;
  const tone = priority === "high" ? "text-danger" : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1 text-[0.8rem] font-semibold ${tone}`}>
      {priority === "high" ? <span aria-hidden className="size-1.5 rounded-full bg-danger" /> : null}
      {PRIORITY_LABELS[priority]} priority
    </span>
  );
}

const AVATAR_STYLES: Record<Role | "neutral", string> = {
  admin: "bg-admin text-white",
  team: "bg-team text-white",
  client: "bg-client text-white",
  neutral: "bg-line text-ink-2",
};

export function Avatar({ name, role, size = "md" }: { name: string; role?: Role | null; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "size-6 text-[0.65rem]" : "size-8 text-xs";
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold ${dimensions} ${AVATAR_STYLES[role ?? "neutral"]}`}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-sm tabular-nums text-muted">{value}%</span>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-[2rem] leading-tight font-semibold tracking-tight" style={{ fontStretch: "90%" }}>
          {title}
        </h1>
        {description ? <p className="mt-1.5 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-paper ${className}`}>{children}</section>;
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3.5">
      <h2 className="font-display text-lg font-semibold" style={{ fontStretch: "92%" }}>
        {children}
      </h2>
      {aside ? <div className="text-sm text-muted">{aside}</div> : null}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-ink text-white hover:bg-ink-2"
      : "border border-line-strong bg-paper text-ink hover:border-ink";
  return (
    <Link href={href} className={`inline-flex items-center rounded-lg px-4 py-2 text-[0.95rem] font-semibold transition-colors ${styles}`}>
      {children}
    </Link>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success"; children: ReactNode }) {
  const styles = {
    info: "border-sky bg-sky-2 text-ink",
    warning: "border-progress/30 bg-progress-soft text-ink",
    success: "border-resolved/30 bg-resolved-soft text-ink",
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-[0.95rem] ${styles}`}>{children}</div>;
}
