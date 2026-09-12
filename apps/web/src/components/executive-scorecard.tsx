import type { CSSProperties } from "react";

import { KpiTrendCharts } from "./kpi-trend-charts";
import type { ExecutiveScorecardViewModel } from "@/app/(admin)/dashboard/selectors";

type MotionStyle = CSSProperties & Partial<Record<"--entry-delay", string>>;

const deltaToneClassNames = {
  neutral: "bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]",
  positive: "bg-[var(--dashboard-success-soft)] text-[var(--dashboard-success)]",
  warning: "bg-[var(--dashboard-danger-soft)] text-[var(--dashboard-danger)]"
} as const;

const insightToneClassNames = {
  accent: "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)]",
  success: "border-[var(--dashboard-success)] bg-[var(--dashboard-success-soft)]",
  warning: "border-[var(--dashboard-danger)] bg-[var(--dashboard-danger-soft)]"
} as const;

interface ExecutiveScorecardProps {
  readonly data: ExecutiveScorecardViewModel;
}

export function ExecutiveScorecard({ data }: ExecutiveScorecardProps) {
  return (
    <section aria-labelledby="executive-scorecard-title" className="flex flex-col gap-6">
      <section
        className="clay-card-raised dashboard-entrance-item overflow-hidden"
        style={{ "--entry-delay": "20ms" } as MotionStyle}>
        <div className="grid gap-5 border-b border-[var(--dashboard-dark-border)] px-5 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.75fr)] lg:px-8">
          <div className="min-w-0">
            <p className="clay-badge inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-accent)]">
              Executive Scorecard
            </p>
            <h1
              className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.05em] text-[var(--dashboard-ink)] sm:text-4xl"
              id="executive-scorecard-title">
              Executive Scorecard
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--dashboard-ink-muted)]">
              Revenue, demand, utilization, and support pressure for the current reporting
              window, backed by live Supabase data.
            </p>
          </div>

          <aside className="clay-inset min-w-0 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-ink-muted)]">
              Reporting window
            </p>
            <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
              {data.reportingWindowLabel}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
              Last refreshed {data.refreshedAtLabel}.
            </p>
          </aside>
        </div>

        <section className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-2 xl:grid-cols-5 lg:px-8">
          {data.headlineMetrics.length > 0 ? (
            data.headlineMetrics.map((metric, index) => (
              <article
                className="clay-card dashboard-entrance-item dashboard-interactive-card min-w-0 p-4"
                key={metric.label}
                style={{ "--entry-delay": `${index * 45 + 90}ms` } as MotionStyle}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--dashboard-ink-muted)]">{metric.label}</p>
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                      deltaToneClassNames[metric.deltaTone]
                    ].join(" ")}>
                    {metric.delta}
                  </span>
                </div>
                <p className="mt-4 font-mono text-3xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                  {metric.value}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">{metric.detail}</p>
              </article>
            ))
          ) : (
            <article className="clay-card dashboard-entrance-item min-w-0 rounded-[1.25rem] p-5 md:col-span-2 xl:col-span-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-accent)]">
                No live metrics yet
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
                Supabase did not return any bikes, rides, or wallets for this reporting window.
              </p>
            </article>
          )}
        </section>
      </section>

      <section
        className="clay-card dashboard-entrance-item p-5 sm:p-6 lg:p-7"
        style={{ "--entry-delay": "180ms" } as MotionStyle}>
        <div className="mb-5 flex min-w-0 flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--dashboard-accent)]">
            Trend lines
          </p>
          <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
            Revenue and demand movement
          </h2>
        </div>
        {data.trends.length > 0 ? (
          <KpiTrendCharts trends={data.trends} />
        ) : (
          <div className="rounded-[1.25rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-5">
            <p className="text-sm font-semibold text-[var(--dashboard-ink)]">No trend data yet</p>
            <p className="mt-2 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
              Live ride history has not been returned from Supabase, so the charts are waiting on
              the first completed ride.
            </p>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.insights.length > 0 ? (
          data.insights.map((insight, index) => (
            <article
              className={[
                "dashboard-entrance-item dashboard-interactive-card rounded-[1.25rem] border p-5",
                insightToneClassNames[insight.tone]
              ].join(" ")}
              key={insight.title}
              style={{ "--entry-delay": `${index * 45 + 240}ms` } as MotionStyle}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-ink-muted)]">
                {insight.title}
              </p>
              <p className="mt-3 font-mono text-2xl font-black tracking-[-0.04em] text-[var(--dashboard-ink)]">
                {insight.value}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">{insight.detail}</p>
            </article>
          ))
        ) : (
          <article className="dashboard-entrance-item clay-card rounded-[1.25rem] border border-[var(--dashboard-line)] p-5 md:col-span-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--dashboard-accent)]">
              No insights available
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--dashboard-ink-muted)]">
              The executive summary will populate once Supabase returns bikes, ride history, and
              wallet rows.
            </p>
          </article>
        )}
      </section>
    </section>
  );
}
