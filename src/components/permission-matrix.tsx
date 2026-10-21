import { can, PERMISSIONS, ROLE_LABELS, ROLES, type Permission } from "@/lib/permissions";

const HEADER_STYLES = {
  admin: "text-admin",
  team: "text-team",
  client: "text-client",
} as const;

/** The same rules the database enforces, as a table people can read. */
export function PermissionMatrix({ caption }: { caption?: string }) {
  const permissions = Object.keys(PERMISSIONS) as Permission[];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-[0.95rem]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-3 pr-4 font-semibold text-muted">
              What they can do
            </th>
            {ROLES.map((role) => (
              <th key={role} scope="col" className={`w-24 px-3 py-3 text-center font-display text-lg font-semibold ${HEADER_STYLES[role]}`}>
                {ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((permission) => (
            <tr key={permission} className="border-b border-line last:border-b-0">
              <th scope="row" className="py-3 pr-4 font-normal">
                {PERMISSIONS[permission].label}
              </th>
              {ROLES.map((role) => (
                <td key={role} className="px-3 py-3 text-center">
                  {can(role, permission) ? (
                    <span className="inline-grid size-6 place-items-center rounded-full bg-ink text-white" aria-label="Yes">
                      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
                        <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : (
                    <span className="text-muted" aria-label="No">
                      –
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
