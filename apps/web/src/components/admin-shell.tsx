import { mockAdminOverview } from "@glide/api";
import { formatCurrency } from "@glide/shared";

const metrics = [
  {
    label: "Active bikes",
    value: mockAdminOverview.activeBikes.toString()
  },
  {
    label: "Active rides",
    value: mockAdminOverview.activeRides.toString()
  },
  {
    label: "Open support sessions",
    value: mockAdminOverview.openSupportSessions.toString()
  },
  {
    label: "Wallet float",
    value: formatCurrency(mockAdminOverview.walletBalanceTotal)
  }
];

export function AdminShell() {
  return (
    <section className="flex flex-col gap-8">
      <section className="rounded-[2rem] bg-[var(--surface)] p-8 shadow-[0_20px_60px_rgba(45,47,47,0.08)]">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--coral-dark)]">
            Dashboard
          </p>
          <h1 className="max-w-2xl text-4xl font-black tracking-[-0.04em] text-[var(--foreground)]">
            Admin operations are wired in. The dashboard is still a placeholder.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
            Login, route protection, and user management now live in the admin panel. This landing
            screen keeps the existing mock overview until the real dashboard modules are ready.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            className="rounded-[2rem] bg-[var(--surface)] p-6 shadow-[0_16px_40px_rgba(45,47,47,0.06)]"
            key={metric.label}>
            <p className="text-sm font-medium text-[var(--foreground-muted)]">{metric.label}</p>
            <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--foreground)]">
              {metric.value}
            </p>
          </article>
        ))}
      </section>
    </section>
  );
}
