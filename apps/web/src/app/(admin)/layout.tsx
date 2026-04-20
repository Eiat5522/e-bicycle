import { AdminNav } from "@/components/admin-nav";
import { GlideBrand } from "@/components/glide-brand";
import { requireAdmin } from "@/lib/auth";

import { signOutAction } from "./actions";

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireAdmin();

  return (
    <main className="clay-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="clay-admin-bar">
        <div className="flex flex-wrap items-start gap-3 p-3 sm:items-center sm:gap-4 sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <GlideBrand variant="admin-header" />

            <div className="min-w-0">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[var(--foreground-muted)]">
                {context.profile.firstName}&apos;s workspace
              </p>
              <p className="truncate text-sm text-[var(--foreground-muted)]">
                {context.user.email ?? "admin user"}
              </p>
            </div>
          </div>

          <div className="order-3 basis-full md:order-2 md:basis-auto md:flex-1">
            <AdminNav />
          </div>

          <form action={signOutAction} className="order-2 w-full md:order-3 md:ml-auto md:w-auto">
            <button
              className="clay-button w-full px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] md:w-auto"
              type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {children}
    </main>
  );
}
