import { signInAsDemo } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/config";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";

const BAR = {
  admin: "bg-admin",
  team: "bg-team",
  client: "bg-client",
} as const;

/** Three ways into the shared demo, one per role. */
export function DemoEntry({ layout = "row" }: { layout?: "row" | "stack" }) {
  return (
    <div className={layout === "row" ? "grid gap-3 sm:grid-cols-3" : "grid gap-3"}>
      {ROLES.map((role) => (
        <form key={role} action={signInAsDemo}>
          <input type="hidden" name="role" value={role} />
          <button
            type="submit"
            className="group relative flex w-full items-stretch overflow-hidden rounded-xl border border-line-strong bg-paper text-left transition-colors hover:border-ink"
          >
            <span aria-hidden className={`w-1.5 shrink-0 ${BAR[role]}`} />
            <span className="px-4 py-3">
              <span className="block font-semibold">
                {DEMO_ACCOUNTS[role].name}
                <span className="font-normal text-muted">, {ROLE_LABELS[role].toLowerCase()}</span>
              </span>
              <span className="block text-sm text-muted">{DEMO_ACCOUNTS[role].title}</span>
            </span>
          </button>
        </form>
      ))}
    </div>
  );
}
