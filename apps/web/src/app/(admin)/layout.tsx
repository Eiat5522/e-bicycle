import { AdminNav } from "@/components/admin-nav";
import { requireAdmin } from "@/lib/auth";

import { signOutAction } from "./actions";

export default async function AdminLayout({
  children,
  drawer
}: Readonly<{
  children: React.ReactNode;
  drawer: React.ReactNode;
}>) {
  const context = await requireAdmin();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-6 rounded-[2rem] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(45,47,47,0.08)] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
            Glide Admin
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black tracking-[-0.05em] text-[var(--foreground)]">
              Welcome back, {context.profile.firstName}.
            </h1>
            <p className="text-sm leading-6 text-[var(--foreground-muted)]">
              Signed in as {context.user.email ?? "admin user"}.
            </p>
          </div>
          <AdminNav />
        </div>

        <form action={signOutAction}>
          <button
            className="rounded-full border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]"
            type="submit">
            Sign out
          </button>
        </form>
      </header>

      {children}
      {drawer}
    </main>
  );
}
