"use client";

import { type ReactNode, useId, useState } from "react";
import type { Role } from "@/lib/permissions";

type Row = {
  title: string;
  company: string;
  status: "Open" | "In progress";
  high?: boolean;
  visibleTo: Role[];
};

const ROWS: Row[] = [
  {
    title: "Menu prices on the homepage are out of date",
    company: "Northwind Coffee",
    status: "Open",
    high: true,
    visibleTo: ["admin", "team", "client"],
  },
  {
    title: "Add the new store hours to the footer",
    company: "Northwind Coffee",
    status: "In progress",
    visibleTo: ["admin", "team", "client"],
  },
  {
    title: "Booking confirmation email shows the old address",
    company: "Lumen Dental",
    status: "In progress",
    high: true,
    visibleTo: ["admin", "team"],
  },
  {
    title: "Product photos missing after the import",
    company: "Casa Verde Plants",
    status: "Open",
    visibleTo: ["admin", "team"],
  },
];

const PEOPLE: { role: Role; name: string; label: string; caption: string }[] = [
  {
    role: "admin",
    name: "Ana",
    label: "Admin",
    caption: "Ana runs Brightside Studio. She sees every client, the team's internal notes and the billing.",
  },
  {
    role: "team",
    name: "Theo",
    label: "Team",
    caption: "Theo builds the sites. He sees every client's requests and the internal notes, but not billing.",
  },
  {
    role: "client",
    name: "Clara",
    label: "Client",
    caption:
      "Clara works at Northwind Coffee. She only gets Northwind's requests, and internal notes never reach her browser.",
  },
];

const SELECTED: Record<Role, string> = {
  admin: "bg-admin text-white",
  team: "bg-team text-white",
  client: "bg-client text-white",
};

function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/** The landing page's live explanation: the same request list, seen by three people. */
export function RolePreview() {
  const [role, setRole] = useState<Role>("client");
  const groupName = useId();
  const person = PEOPLE.find((item) => item.role === role)!;

  return (
    <div className="rounded-2xl border border-white/70 bg-paper/95 shadow-[0_24px_60px_-28px_rgb(20_33_61_/_0.45)]">
      <fieldset className="border-b border-line px-5 pt-4 pb-3">
        <legend className="sr-only">Show the portal as</legend>
        <p aria-hidden className="mb-2 text-sm text-muted">
          Show the portal as
        </p>
        <div className="inline-flex rounded-full bg-mist p-1">
          {PEOPLE.map((item) => (
            <label
              key={item.role}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-open ${
                role === item.role ? SELECTED[item.role] : "text-ink-2 hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={item.role}
                checked={role === item.role}
                onChange={() => setRole(item.role)}
                className="sr-only"
              />
              {item.name}, {item.label.toLowerCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="px-5 pt-4">
        <p className="font-display text-lg font-semibold" style={{ fontStretch: "92%" }}>
          Requests
        </p>
      </div>
      <ul className="px-2 pb-2">
        {ROWS.map((row) => (
          <li key={row.title}>
            <Collapsible open={row.visibleTo.includes(role)}>
              <div className="flex items-start justify-between gap-3 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[0.95rem] leading-snug font-semibold">{row.title}</p>
                  <p className="text-sm text-muted">{row.company}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  {row.high ? <span title="High priority" className="size-1.5 rounded-full bg-danger" /> : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.status === "Open" ? "bg-open-soft text-open" : "bg-progress-soft text-progress"
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              </div>
            </Collapsible>
          </li>
        ))}
        <li>
          <Collapsible open={role !== "client"}>
            <div className="internal-note mx-1 my-1 rounded-lg px-3 py-2.5 text-sm">
              <span className="font-semibold text-progress">Internal note on the menu request: </span>
              Prices are hard-coded in the homepage component. Let&apos;s move them into the CMS.
            </div>
          </Collapsible>
        </li>
        <li>
          <Collapsible open={role === "admin"}>
            <div className="mx-1 my-1 flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm">
              <span className="font-semibold">Billing</span>
              <span className="text-muted">Free plan, 3 of 3 clients</span>
            </div>
          </Collapsible>
        </li>
      </ul>
      <p aria-live="polite" className="border-t border-line px-5 py-3.5 text-[0.95rem] text-ink-2">
        {person.caption}
      </p>
    </div>
  );
}
