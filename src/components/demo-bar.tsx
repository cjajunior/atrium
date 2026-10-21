import { signInAsDemo } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/config";
import { firstName } from "@/lib/format";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import type { Viewer } from "@/lib/session";

const SWITCH_STYLES = {
  admin: "border-white/40 hover:bg-white/10",
  team: "border-[#5eead4]/60 hover:bg-[#5eead4]/10",
  client: "border-[#f0a6cb]/60 hover:bg-[#f0a6cb]/10",
} as const;

/** Shown only in the shared demo workspace: who you are, and one click to see another role. */
export function DemoBar({ viewer }: { viewer: Viewer }) {
  const others = ROLES.filter((role) => role !== viewer.role);

  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 text-sm sm:px-8">
        <p>
          You&apos;re in the shared demo as <strong>{viewer.name}</strong> ({ROLE_LABELS[viewer.role]}
          {viewer.company ? ` at ${viewer.company.name}` : ""}). It resets every hour.
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <span className="text-white/70">See it as</span>
          {others.map((role) => (
            <form key={role} action={signInAsDemo}>
              <input type="hidden" name="role" value={role} />
              <button
                type="submit"
                className={`rounded-full border px-3 py-1 font-semibold transition-colors ${SWITCH_STYLES[role]}`}
              >
                {firstName(DEMO_ACCOUNTS[role].name)}, {ROLE_LABELS[role].toLowerCase()}
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
