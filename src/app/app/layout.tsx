import { signOut } from "@/app/actions/auth";
import { DemoBar } from "@/components/demo-bar";
import { NavLinks } from "@/components/nav-links";
import { Avatar, Logo, RoleBadge } from "@/components/ui";
import { navigationFor } from "@/lib/permissions";
import { requireViewer } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireViewer();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-line bg-paper lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block lg:px-6 lg:pt-6">
          <Logo href="/app" />
          <div className="lg:mt-6">
            <p className="hidden text-sm text-muted lg:block">Workspace</p>
            <p className="text-sm font-semibold lg:text-base">{viewer.workspace.name}</p>
          </div>
        </div>

        <NavLinks items={navigationFor(viewer.role)} />

        <div className="mt-auto hidden border-t border-line px-6 py-5 lg:block">
          <div className="flex items-center gap-3">
            <Avatar name={viewer.name} role={viewer.role} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{viewer.name}</p>
              <p className="truncate text-sm text-muted">{viewer.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <RoleBadge role={viewer.role} />
            <form action={signOut}>
              <button type="submit" className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {viewer.workspace.isDemo ? <DemoBar viewer={viewer} /> : null}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-10">{children}</main>
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-8 lg:hidden">
          <form action={signOut} className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-sm text-muted">Signed in as {viewer.name}</span>
            <button type="submit" className="text-sm font-semibold underline underline-offset-4">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
