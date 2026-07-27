import type { CSSProperties, ReactNode } from "react";

import {
  formatCurrency,
  formatDistanceKm,
  formatDuration
} from "@glide/shared";
import Link from "next/link";

import { bikeStatusLabels } from "@glide/shared";
import { formatAdminDate } from "@/lib/formatting";
import type { OperationsDashboardViewModel } from "@/app/(admin)/dashboard/selectors";

type DashboardTheme = CSSProperties & Record<`--${string}`, string>;
type MotionStyle = CSSProperties & Partial<Record<"--entry-delay" | "--progress-scale", string>>;

const dashboardTheme: DashboardTheme = {
  "--dashboard-bg": "rgba(248, 241, 255, 0.76)",
  "--dashboard-panel": "rgba(255, 250, 255, 0.92)",
  "--dashboard-panel-soft": "rgba(240, 231, 255, 0.72)",
  "--dashboard-line": "rgba(209, 193, 238, 0.55)",
  "--dashboard-ink": "var(--clay-text-primary)",
  "--dashboard-ink-muted": "var(--clay-text-secondary)",
  "--dashboard-accent": "var(--clay-accent)",
  "--dashboard-accent-soft": "var(--clay-accent-soft)",
  "--dashboard-highlight": "#d9738c",
  "--dashboard-highlight-soft": "rgba(217, 115, 140, 0.16)",
  "--dashboard-success": "var(--clay-success)",
  "--dashboard-success-soft": "var(--clay-success-soft)",
  "--dashboard-danger": "var(--clay-danger)",
  "--dashboard-danger-soft": "var(--clay-danger-soft)",
  "--dashboard-dark-panel": "rgba(238, 228, 255, 0.78)",
  "--dashboard-dark-border": "rgba(209, 193, 238, 0.55)",
  "--dashboard-dark-text": "var(--clay-text-primary)"
};

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
      ? "clay-badge text-[var(--dashboard-accent)]"
      : tone === "success"
        ? "clay-badge bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]"
        : "clay-badge text-[var(--dashboard-dark-text)]";

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

interface OperationsDashboardProps {
  readonly data: OperationsDashboardViewModel;
}

export function OperationsDashboard({ data }: OperationsDashboardProps) {
  return (
    <section className="flex flex-col gap-6" style={dashboardTheme}>
      <section
        className="clay-card-raised dashboard-entrance-item overflow-hidden"
        style={{ "--entry-delay": "20ms" } as MotionStyle}>
        <div className="grid gap-6 border-b border-[var(--dashboard-dark-border)] px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone="accent">Executive Dashboard</StatusBadge>
              <StatusBadge tone="success">Live telemetry</StatusBadge>
            </div>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-2xl text-3xl font-black tracking-[-0.05em] text-[var(--dashboard-ink)] sm:text-4xl md:text-5xl">
                Live operations snapshot
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--dashboard-ink-muted)]">
                Monitor dispatch readiness, revenue capture, rider activity, and support pressure
                from a single executive view. Every module below is grounded in the current shared
                Supabase data, so the dashboard stays honest while the live backend catches up.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div
                className="clay-inset dashboard-interactive-card min-w-0 p-4 transition-transform"
                style={{ "--entry-delay": "40ms" } as MotionStyle}>
                <dt className="text-sm font-medium text-[var(--dashboard-ink-muted)]">Last sync</dt>
                <dd className="mt-2 text-lg font-semibold text-[var(--dashboard-ink)]">
                  {data.lastSyncLabel}
                </dd>
              </div>
              <div
                className="clay-inset dashboard-interactive-card min-w-0 p-4 transition-transform"
                style={{ "--entry-delay": "80ms" } as MotionStyle}>
                <dt className="text-sm font-medium text-[var(--dashboard-ink-muted)]">Fleet range average</dt>
                <dd className="mt-2 text-lg font-semibold text-[var(--dashboard-ink)]">
                  {formatDistanceKm(data.averageFleetRangeKm)}
                </dd>
              </div>
              <div
                className="clay-inset dashboard-interactive-card min-w-0 p-4 transition-transform"
                style={{ "--entry-delay": "120ms" } as MotionStyle}>
                <dt className="text-sm font-medium text-[var(--dashboard-ink-muted)]">Completed ride average</dt>
                <dd className="mt-2 text-lg font-semibold text-[var(--dashboard-ink)]">
                  {formatDistanceKm(data.averageRideDistanceKm)}
                </dd>
              </div>
            </dl>
          </div>

          <aside className="clay-inset dashboard-interactive-card min-w-0 p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-ink-muted)]">
              Network health
            </p>
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-sm text-[var(--dashboard-ink-muted)]">Ride in progress</p>
                <p className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                  {data.activeRide?.bikeId ?? "No active ride"}
                </p>
                {data.activeRide?.riderLabel ? (
                  <p className="mt-2 text-sm font-semibold text-[var(--dashboard-ink)]">
                    Currently in use by {data.activeRide.riderLabel}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                  {data.activeRide ? (
                    <>
                      {formatDistanceKm(data.activeRide.distanceKm)} covered with{" "}
                      {data.activeRide.nextDropoffZoneKm !== null && data.activeRide.nextDropoffZoneKm !== undefined
                        ? `${formatDistanceKm(data.activeRide.nextDropoffZoneKm)} to next drop-off zone · ${data.activeRide.dropoffState.replace("_", " ")}`
                        : "drop-off zone status pending"}
                      .
                    </>
                  ) : (
                    "No ride telemetry yet."
                  )}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="clay-card dashboard-interactive-card min-w-0 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    Completed revenue
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                    {formatCurrency(data.completedRevenue)}
                  </p>
                </div>
                <div className="clay-card dashboard-interactive-card min-w-0 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    Avg. ride duration
                  </p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                    {formatDuration(data.averageRideDurationSec)}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
          {data.summaryMetrics.map((metric, index) => (
            <article
              className="clay-card dashboard-entrance-item dashboard-interactive-card min-w-0 p-4 sm:p-5"
              key={metric.label}
              style={{ "--entry-delay": `${index * 50 + 120}ms` } as MotionStyle}>
              <p className="text-sm font-medium text-[var(--dashboard-ink-muted)]">{metric.label}</p>
              <p className="mt-4 font-mono text-3xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {metric.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">{metric.note}</p>
            </article>
          ))}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <article
          className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
          style={{ "--entry-delay": "180ms" } as MotionStyle}>
          <div className="flex min-w-0 flex-col gap-2">
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
            {data.targetMetrics.map((metric, index) => {
              const progress = clampProgress(metric.progress);

              return (
                <section
                  className="dashboard-interactive-card rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5"
                  key={metric.label}
                  style={{ "--entry-delay": `${index * 45 + 210}ms` } as MotionStyle}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
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
                      className="dashboard-progress-fill h-2 rounded-full bg-[var(--dashboard-accent)]"
                      style={{ "--progress-scale": `${progress / 100}` } as MotionStyle}
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

        <article
          className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
          style={{ "--entry-delay": "220ms" } as MotionStyle}>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-highlight)]">
              Fleet status
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Dispatch mix
            </h2>
          </div>

          <div className="mt-6 grid gap-3">
            {data.fleetBreakdown.map((status, index) => {
              const share = data.totalBikes === 0 ? 0 : clampProgress((status.count / data.totalBikes) * 100);

              return (
                <div
                  className="dashboard-interactive-card rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4"
                  key={status.label}
                  style={{ "--entry-delay": `${index * 40 + 260}ms` } as MotionStyle}>
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
                      className="dashboard-progress-fill h-2 rounded-full"
                      style={
                        {
                          "--progress-scale": `${share / 100}`,
                          backgroundColor: status.accent
                        } as MotionStyle
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.9fr)]">
        <article
          className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
          style={{ "--entry-delay": "280ms" } as MotionStyle}>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">
              Revenue operations
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Route revenue by recent rides
            </h2>
          </div>

          <div className="mt-6 overflow-x-auto overflow-y-hidden rounded-[1.5rem] border border-[var(--dashboard-line)]">
            <table className="min-w-[680px] border-collapse md:min-w-full">
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
              {data.recentRoutes.length > 0 ? (
                <tbody>
                  {data.recentRoutes.map((ride, index) => (
                    <tr
                      className="dashboard-table-row border-t border-[var(--dashboard-line)]"
                      key={ride.id}
                      style={{ "--entry-delay": `${index * 35 + 320}ms` } as MotionStyle}>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <p className="font-semibold text-[var(--dashboard-ink)]">{ride.routeLabel}</p>
                          <p className="text-sm text-[var(--dashboard-ink-muted)]">
                            Completed {formatAdminDate(ride.completedAt)}
                          </p>
                          <Link
                            aria-label={`Replay ${ride.routeLabel}`}
                            className="mt-2 inline-flex w-fit rounded-full bg-[var(--dashboard-accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--dashboard-accent)] transition hover:bg-[var(--dashboard-accent)] hover:text-white"
                            href={`/dashboard/ride-replay/${ride.id}`}>
                            Replay route
                          </Link>
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
              ) : (
                <tbody>
                  <tr>
                    <td className="px-4 py-6 text-sm leading-6 text-[var(--dashboard-ink-muted)]" colSpan={4}>
                      No completed rides have synced yet. Recent routes will appear here once
                      Supabase returns bike ride history rows.
                    </td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        </article>

        <article
          className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
          style={{ "--entry-delay": "320ms" } as MotionStyle}>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-highlight)]">
              Live activity feed
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Operator timeline
            </h2>
          </div>

          <ol className="mt-6 grid gap-4">
            {data.activityFeed.map((item, index) => (
              <li
                className="dashboard-entrance-item dashboard-interactive-card rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4"
                key={item.title}
                style={{ "--entry-delay": `${index * 45 + 360}ms` } as MotionStyle}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--dashboard-ink)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                      {item.detail}
                    </p>
                  </div>
                  <span className="clay-badge px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                    {item.timestamp}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
        <article
          className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
          style={{ "--entry-delay": "360ms" } as MotionStyle}>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">
              Executive notes
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              What changed since the last sync
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="dashboard-interactive-card rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                Revenue per completed ride
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {formatCurrency(data.averageCompletedRideRevenue)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Based on the current tracked ride history across Supabase.
              </p>
            </div>

            <div className="dashboard-interactive-card rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                Active ride cost
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {formatCurrency(data.activeRide?.currentCost ?? 0)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Current trip cost for {data.activeRide?.bikeId ?? "the active bike"}, updated while the ride is open.
              </p>
            </div>

            <div className="dashboard-interactive-card rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                Payment methods in rotation
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {data.paymentMethodsCount}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Wallet funding rails currently mapped in Supabase wallet rows.
              </p>
            </div>
          </div>
        </article>

        <article
          className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
          style={{ "--entry-delay": "400ms" } as MotionStyle}>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-highlight)]">
              Fleet watchlist
            </p>
            <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              Lowest range bikes
            </h2>
          </div>

          <div className="mt-6 grid gap-3">
            {data.watchlist.length > 0 ? (
              data.watchlist.map((bike, index) => (
                <Link
                  className="dashboard-entrance-item dashboard-interactive-card cursor-pointer rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--dashboard-accent-soft)] hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dashboard-bg)]"
                  aria-label={`Open bicycle ${bike.id}`}
                  href={`/bicycles/${bike.id}`}
                  key={bike.id}
                  style={{ "--entry-delay": `${index * 35 + 420}ms` } as MotionStyle}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--dashboard-ink)]">
                        {bike.model} · {bike.id}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                        {bike.location} · last reported {formatAdminDate(bike.lastReportedAt)}
                      </p>
                    </div>
                    <span className="clay-badge px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                      {bikeStatusLabels[bike.status]}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--dashboard-ink-muted)]">Estimated range</p>
                    <p className="font-mono text-sm font-semibold text-[var(--dashboard-ink)]">
                      {formatDistanceKm(bike.estimatedRangeKm)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <section className="rounded-[1.5rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
                <p className="text-sm font-semibold text-[var(--dashboard-ink)]">No bikes available</p>
                <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                  The lowest-range watchlist will populate once bike rows are available from
                  Supabase.
                </p>
              </section>
            )}
          </div>
        </article>
      </section>
    </section>
  );
}
