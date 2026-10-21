import type { Enums } from "./database.types";

export type Role = Enums<"member_role">;

export const ROLES: Role[] = ["admin", "team", "client"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  team: "Team",
  client: "Client",
};

/**
 * What each role can do, in plain words. The interface uses this to decide what to show;
 * the database enforces the same rules on its own (supabase/migrations/*_access_rules.sql),
 * so hiding a button is never the only protection.
 */
export const PERMISSIONS = {
  "requests.create": {
    label: "Open requests",
    roles: ["admin", "team", "client"],
  },
  "requests.manage": {
    label: "Change status, priority and assignee",
    roles: ["admin", "team"],
  },
  "notes.internal": {
    label: "Read and write internal notes",
    roles: ["admin", "team"],
  },
  "work.all": {
    label: "See every client's projects",
    roles: ["admin", "team"],
  },
  "clients.manage": {
    label: "Add clients",
    roles: ["admin"],
  },
  "team.view": {
    label: "See who has access",
    roles: ["admin"],
  },
  "billing.manage": {
    label: "Manage the subscription",
    roles: ["admin"],
  },
} as const satisfies Record<string, { label: string; roles: readonly Role[] }>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission].roles as readonly Role[]).includes(role);
}

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
};

const NAVIGATION: NavItem[] = [
  { href: "/app", label: "Overview" },
  { href: "/app/requests", label: "Requests" },
  { href: "/app/projects", label: "Projects" },
  { href: "/app/clients", label: "Clients", permission: "work.all" },
  { href: "/app/team", label: "Team and access", permission: "team.view" },
  { href: "/app/billing", label: "Billing", permission: "billing.manage" },
];

export function navigationFor(role: Role): NavItem[] {
  return NAVIGATION.filter((item) => !item.permission || can(role, item.permission));
}
