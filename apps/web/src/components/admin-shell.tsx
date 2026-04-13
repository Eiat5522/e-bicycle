import type { CSSProperties, ReactNode } from "react";

import {
  mockActiveRide,
  mockAdminOverview,
  mockBikes,
  mockNearbyBikesResult,
  mockRideHistory,
  mockWallet
} from "@glide/api";
import { formatCurrency, formatDistanceKm, formatDuration } from "@glide/shared";

import { formatAdminDate } from "@/lib/formatting";

type DashboardTheme = CSSProperties & Record<`--${string}`, string>;

const dashboardTheme: DashboardTheme = {
  "--dashboard-bg": "#0f172a",
  "--dashboard-panel": "#ffffff",
  "--dashboard-panel-soft": "#f8fafc",
  "--dashboard-line": "#cbd5e1",
  "--dashboard-ink": "#0f172a",
  "--dashboard-ink-muted": "#475569",
  "--dashboard-accent": "#2563eb",
  "--dashboard-accent-soft": "rgba(37, 99, 235, 0.12)",
  "--dashboard-highlight": "#f97316",
  "--dashboard-highlight-soft": "rgba(249, 115, 22, 0.14)",
  "--dashboard-success": "#15803d",
  "--dashboard-success-soft": "rgba(21, 128, 61, 0.12)",
  "--dashboard-danger": "#b91c1c",
  "--dashboard-danger-soft": "rgba(185, 28, 28, 0.12)",
  "--dashboard-dark-panel": "#111827",
  "--dashboard-dark-border": "rgba(148, 163, 184, 0.2)",
  "--dashboard-dark-text": "#e2e8f0"
};

const fleetCounts = mockBikes.reduce<Record<string, number>>((counts, bike) => {
  counts[bike.status] = (counts[bike.status] ?? 0) + 1;
  return counts;
}, {});

const totalBikes = mockBikes.length;
const availableBikes = fleetCounts.available ?? 0;
const averageRangeKm =
  mockBikes.reduce((totalRange, bike) => totalRange + bike.estimatedRangeKm, 0) / totalBikes;
const averageRideDistanceKm =
  mockRideHistory.reduce((totalDistance, ride) => totalDistance + ride.distanceKm, 0) /
  mockRideHistory.length;
const averageRideDurationSec =
  mockRideHistory.reduce((totalDuration, ride) => totalDuration + ride.durationSec, 0) /
  mockRideHistory.length;
const completedRevenue = mockRideHistory.reduce((totalRevenue, ride) => totalRevenue + ride.totalCost, 0);
const totalTrackedRevenue = completedRevenue + mockActiveRide.currentCost;
const averageCompletedRideRevenue =
  mockRideHistory.length === 0 ? 0 : completedRevenue / mockRideHistory.length;

const summaryMetrics = [
  {
    label: "Fleet availability",
    value: `${availableBikes}/${totalBikes}`,
    note: `${Math.round((availableBikes / totalBikes) * 100)}% dispatch-ready`
  },
  {
    label: "Active rides",
    value: mockAdminOverview.activeRides.toString(),
    note: `${formatDistanceKm(mockActiveRide.distanceKm)} in motion`
  },
  {
    label: "Support load",
    value: mockAdminOverview.openSupportSessions.toString(),
    note: "Chatbot and live-agent queue open"
  },
  {
    label: "Wallet float",
    value: formatCurrency(mockAdminOverview.walletBalanceTotal),
    note: `${formatCurrency(totalTrackedRevenue)} captured in tracked rides`
  }
];

const targetMetrics = [
  {
    label: "Fleet dispatch readiness",
    currentValue: `${availableBikes} of ${totalBikes} bikes ready`,
    helperText: "Target: every bike is available or freshly reassigned.",
    progress: (availableBikes / totalBikes) * 100
  },
  {
    label: "Wallet float target",
    currentValue: formatCurrency(mockAdminOverview.walletBalanceTotal),
    helperText: `Target: ${formatCurrency(1500)} available for active demand.`,
    progress: (mockAdminOverview.walletBalanceTotal / 1500) * 100
  },
  {
    label: "Average fleet range",
    currentValue: formatDistanceKm(averageRangeKm),
    helperText: "Target: 40 km average range before a swap cycle.",
    progress: (averageRangeKm / 40) * 100
  }
];

const fleetBreakdown = [
  {
    label: "Available",
    count: fleetCounts.available ?? 0,
    accent: "var(--dashboard-success)",
    accentSoft: "var(--dashboard-success-soft)"
  },
  {
    label: "In use",
    count: fleetCounts.in_use ?? 0,
    accent: "var(--dashboard-accent)",
    accentSoft: "var(--dashboard-accent-soft)"
  },
  {
    label: "Reserved",
    count: fleetCounts.reserved ?? 0,
    accent: "var(--dashboard-highlight)",
    accentSoft: "var(--dashboard-highlight-soft)"
  },
  {
    label: "Maintenance",
    count: fleetCounts.maintenance ?? 0,
    accent: "var(--dashboard-danger)",
    accentSoft: "var(--dashboard-danger-soft)"
  }
];

const recentRoutes = [...mockRideHistory]
  .sort((left, right) => right.totalCost - left.totalCost)
  .slice(0, 3);

const watchlist = [...mockBikes]
  .sort((left, right) => left.estimatedRangeKm - right.estimatedRangeKm)
  .slice(0, 4);

const activityFeed = [
  {
    title: "Telemetry sync completed",
    detail: `${totalBikes} bikes checked in across the Bangkok network.`,
    timestamp: formatAdminDate(mockNearbyBikesResult.serverTime)
  },
  {
    title: "Ride still in progress",
    detail: `${mockActiveRide.bikeId} is ${formatDistanceKm(mockActiveRide.distanceKm)} into the ${mockActiveRide.startLocation} route.`,
    timestamp: "Live now"
  },
  {
    title: "Latest wallet event",
    detail: `${mockWallet.transactions[0]?.title ?? "Wallet updated"} recorded for ${formatCurrency(Math.abs(mockWallet.transactions[0]?.amount ?? 0))}.`,
    timestamp: mockWallet.transactions[0] ? formatAdminDate(mockWallet.transactions[0].timestamp) : "No recent event"
  },
  {
    title: "Most valuable completed ride",
    detail: `${recentRoutes[0]?.routeLabel ?? "No route"} closed at ${formatCurrency(recentRoutes[0]?.totalCost ?? 0)}.`,
    timestamp: recentRoutes[0] ? formatAdminDate(recentRoutes[0].completedAt) : "No recent completion"
  }
];

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, progress));
}

function StatusBadge({
  children,
  tone = "default"
}: {
  readonly children: ReactNode;
  readonly tone?: "default" | "accent" | "success";
}) {
  const toneClassName =
    tone === "accent"
      ? "bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]"
      : tone === "success"
        ? "bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]"
        : "bg-white/10 text-[var(--dashboard-dark-text)]";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        toneClassName
      ].join(" ")}>
      {children}
    </span>
  );
}

export function AdminShell() {
  return (
    <section className="flex flex-col gap-6" style={dashboardTheme}>
      <section className="overflow-hidden rounded-[2rem] bg-[var(--dashboard-bg)] shadow-[0_32px_80px_rgba(15,23,42,0.28)]">
        <div className="grid gap-6 border-b border-[var(--dashboard-dark-border)] px-8 py-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="accent">Executive Dashboard</StatusBadge>
              <StatusBadge tone="success">Live telemetry</StatusBadge>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                Live operations snapshot
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Monitor dispatch readiness, revenue capture, rider activity, and support pressure
                from a single executive view. Every module below is grounded in the current shared
                mock services, so the dashboard stays honest while the live backend catches up.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <dt className="text-sm font-medium text-slate-300">Last sync</dt>
                <dd className="mt-2 text-lg font-semibold text-white">
                  {formatAdminDate(mockNearbyBikesResult.serverTime)}
                </dd>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <dt className="text-sm font-medium text-slate-300">Fleet range average</dt>
                <dd className="mt-2 text-lg font-semibold text-white">{formatDistanceKm(averageRangeKm)}</dd>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <dt className="text-sm font-medium text-slate-300">Completed ride average</dt>
                <dd className="mt-2 text-lg font-semibold text-white">
                  {formatDistanceKm(averageRideDistanceKm)}
                </dd>
              </div>
            </dl>
          </div>

          <aside className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
              Network health
            </p>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-sm text-slate-300">Ride in progress</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">
                  {mockActiveRide.bikeId}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {formatDistanceKm(mockActiveRide.distanceKm)} covered with{" "}
                  {mockActiveRide.nextDropoffZoneKm
                    ? `${formatDistanceKm(mockActiveRide.nextDropoffZoneKm)} to next drop-off zone`
                    : "drop-off zone status pending"}.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Completed revenue
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    {formatCurrency(completedRevenue)}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-black/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Avg. ride duration
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                    {formatDuration(averageRideDurationSec)}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 px-8 py-6 md:grid-cols-2 xl:grid-cols-4">
          {summaryMetrics.map((metric) => (
            <article
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5"
              key={metric.label}>
              <p className="text-sm font-medium text-slate-300">{metric.label}</p>
              <p className="mt-4 font-mono text-3xl font-black tracking-[-0.04em] text-white">
                {metric.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{metric.note}</p>
            </article>
          ))}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <article className="rounded-[2rem] bg-[var(--dashboard-panel)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">
              Operational thresholds
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Performance against target
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-[var(--dashboard-ink-muted)]">
              Each target keeps the dashboard data readable and comparable without hiding the raw
              numbers behind color alone.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {targetMetrics.map((metric) => {
              const progress = clampProgress(metric.progress);

              return (
                <section
                  className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5"
                  key={metric.label}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--dashboard-ink)]">{metric.label}</h3>
                      <p className="mt-2 font-mono text-lg font-semibold text-[var(--dashboard-ink)]">
                        {metric.currentValue}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--dashboard-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--dashboard-accent)]">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[var(--dashboard-line)]">
                    <div
                      aria-hidden="true"
                      className="h-2 rounded-full bg-[var(--dashboard-accent)]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                    {metric.helperText}
                  </p>
                </section>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--dashboard-panel)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-highlight)]">
              Fleet status
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Dispatch mix
            </h2>
          </div>

          <div className="mt-6 grid gap-3">
            {fleetBreakdown.map((status) => {
              const share = totalBikes === 0 ? 0 : clampProgress((status.count / totalBikes) * 100);

              return (
                <div
                  className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4"
                  key={status.label}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: status.accent }}
                      />
                      <p className="text-sm font-semibold text-[var(--dashboard-ink)]">{status.label}</p>
                    </div>
                    <p className="font-mono text-sm font-semibold text-[var(--dashboard-ink)]">
                      {status.count} bikes
                    </p>
                  </div>
                  <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: status.accentSoft }}>
                    <div
                      aria-hidden="true"
                      className="h-2 rounded-full"
                      style={{ backgroundColor: status.accent, width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.9fr)]">
        <article className="rounded-[2rem] bg-[var(--dashboard-panel)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">
              Revenue operations
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Route revenue by recent rides
            </h2>
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--dashboard-line)]">
            <table className="min-w-full border-collapse">
              <thead className="bg-[var(--dashboard-panel-soft)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    Route
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    Distance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentRoutes.map((ride) => (
                  <tr className="border-t border-[var(--dashboard-line)]" key={ride.id}>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-[var(--dashboard-ink)]">{ride.routeLabel}</p>
                        <p className="text-sm text-[var(--dashboard-ink-muted)]">
                          Completed {formatAdminDate(ride.completedAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-[var(--dashboard-ink)]">
                      {formatDistanceKm(ride.distanceKm)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-[var(--dashboard-ink)]">
                      {formatDuration(ride.durationSec)}
                    </td>
                    <td className="px-4 py-4 font-mono text-sm font-semibold text-[var(--dashboard-ink)]">
                      {formatCurrency(ride.totalCost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--dashboard-panel)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-highlight)]">
              Live activity feed
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Operator timeline
            </h2>
          </div>

          <ol className="mt-6 grid gap-4">
            {activityFeed.map((item) => (
              <li
                className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4"
                key={item.title}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--dashboard-ink)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                      {item.detail}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    {item.timestamp}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
        <article className="rounded-[2rem] bg-[var(--dashboard-panel)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">
              Executive notes
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              What changed since the last sync
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                Revenue per completed ride
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {formatCurrency(averageCompletedRideRevenue)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Based on the current tracked ride history across the admin mock services.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                Active ride cost
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {formatCurrency(mockActiveRide.currentCost)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Current trip cost for {mockActiveRide.bikeId}, updated while the ride is open.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                Payment methods in rotation
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {mockWallet.paymentMethods.length}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Wallet funding rail currently mapped in the shared mock wallet.
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] bg-[var(--dashboard-panel)] p-7 shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-highlight)]">
              Fleet watchlist
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Lowest range bikes
            </h2>
          </div>

          <div className="mt-6 grid gap-3">
            {watchlist.map((bike) => (
              <section
                className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4"
                key={bike.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--dashboard-ink)]">
                      {bike.model} · {bike.id}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                      {bike.location} · last reported {formatAdminDate(bike.lastReportedAt)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    {bike.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--dashboard-ink-muted)]">Estimated range</p>
                  <p className="font-mono text-sm font-semibold text-[var(--dashboard-ink)]">
                    {formatDistanceKm(bike.estimatedRangeKm)}
                  </p>
                </div>
              </section>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
