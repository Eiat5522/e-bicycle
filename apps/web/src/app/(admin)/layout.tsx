import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";

import { signOutAction } from "./actions";

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const context = await requireAdmin();

  return (
    <main className="clay-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="clay-admin-bar">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--clay-accent-strong)]">
              Glide Admin
            </p>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-[-0.05em] text-[var(--foreground)] md:text-3xl">
                Welcome back, {context.profile.firstName}.
              </h1>
              <p className="text-sm leading-6 text-[var(--foreground-muted)]">
                Signed in as {context.user.email ?? "admin user"}.
              </p>
            </div>
          </div>

          <form action={signOutAction}>
            <button
              className="clay-button px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
              type="submit">
              Sign out
            </button>
          </form>
        </div>

        <div className="border-t border-[var(--clay-border-subtle)] px-3 py-3 md:px-4">
          <AdminNav />
        </div>
      </header>

      {children}
    </main>
  );
}
