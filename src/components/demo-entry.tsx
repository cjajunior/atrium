import { signInAsDemo } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/config";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";

const BAR = {
  admin: "bg-admin",
  team: "bg-team",
  client: "bg-client",
} as const;

const TEXT = {
  admin: "text-admin",
  team: "text-team",
  client: "text-client",
} as const;

/** Three ways into the shared demo, one per role. */
export function DemoEntry({ layout = "row" }: { layout?: "row" | "stack" }) {
  return (
    <div className={layout === "row" ? "grid gap-3 sm:grid-cols-3" : "grid gap-3"}>
      {ROLES.map((role) => (
        <form key={role} action={signInAsDemo} className="flex">
          <input type="hidden" name="role" value={role} />
          <button
            type="submit"
            className="group relative flex w-full items-stretch overflow-hidden rounded-xl border border-line-strong bg-paper text-left transition-colors hover:border-ink"
          >
            <span aria-hidden className={`w-1.5 shrink-0 ${BAR[role]}`} />
            {layout === "row" ? (
              <span className="flex min-w-0 flex-col px-4 py-3">
                <span className={`text-xs font-semibold tracking-wide uppercase ${TEXT[role]}`}>{ROLE_LABELS[role]}</span>
                <span className="mt-1 font-semibold">{DEMO_ACCOUNTS[role].name}</span>
                <span className="text-sm text-muted">{DEMO_ACCOUNTS[role].title}</span>
              </span>
            ) : (
              <span className="px-4 py-3">
                <span className="block font-semibold">
                  {DEMO_ACCOUNTS[role].name}
                  <span className="font-normal text-muted">, {ROLE_LABELS[role].toLowerCase()}</span>
                </span>
                <span className="block text-sm text-muted">{DEMO_ACCOUNTS[role].title}</span>
              </span>
            )}
          </button>
        </form>
      ))}
    </div>
  );
}
