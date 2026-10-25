"use client";

import type { KpiTrendPoint } from "@glide/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface KpiTrendChartsProps {
  readonly trends: readonly KpiTrendPoint[];
}

export function KpiTrendCharts({ trends }: KpiTrendChartsProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.85fr)]">
      <section
        aria-labelledby="demand-revenue-trend-title"
        className="min-w-0 rounded-[1.25rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4">
        <div className="flex flex-col gap-1">
          <h3
            className="text-sm font-semibold text-[var(--dashboard-ink)]"
            id="demand-revenue-trend-title">
            Demand and revenue trend chart
          </h3>
          <p className="text-sm text-[var(--dashboard-ink-muted)]">
            Seven-day revenue and active ride movement.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto" aria-hidden="true">
          <LineChart data={[...trends]} height={260} margin={{ left: -18, right: 16, top: 12 }} width={620}>
            <CartesianGrid stroke="rgba(209, 193, 238, 0.65)" strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="var(--dashboard-ink-muted)" tickLine={false} />
            <YAxis stroke="var(--dashboard-ink-muted)" tickLine={false} width={52} />
            <Tooltip />
            <Legend />
            <Line
              dataKey="revenue"
              name="Revenue"
              stroke="var(--dashboard-accent)"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              dataKey="activeRides"
              name="Active rides"
              stroke="var(--dashboard-highlight)"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </div>
      </section>

      <section
        aria-labelledby="utilization-support-trend-title"
        className="min-w-0 rounded-[1.25rem] border border-[var(--dashboard-line)] bg-[var(--dashboard-panel-soft)] p-4">
        <div className="flex flex-col gap-1">
          <h3
            className="text-sm font-semibold text-[var(--dashboard-ink)]"
            id="utilization-support-trend-title">
            Utilization and support load
          </h3>
          <p className="text-sm text-[var(--dashboard-ink-muted)]">
            Utilization percentage beside support queue load.
          </p>
        </div>
        <div className="mt-4 overflow-x-auto" aria-hidden="true">
          <BarChart data={[...trends]} height={260} margin={{ left: -18, right: 16, top: 12 }} width={420}>
            <CartesianGrid stroke="rgba(209, 193, 238, 0.65)" strokeDasharray="4 4" />
            <XAxis dataKey="label" stroke="var(--dashboard-ink-muted)" tickLine={false} />
            <YAxis stroke="var(--dashboard-ink-muted)" tickLine={false} width={52} />
            <Tooltip />
            <Legend />
            <Bar dataKey="utilization" fill="var(--dashboard-success)" name="Utilization" radius={[8, 8, 0, 0]} />
            <Bar dataKey="supportLoad" fill="var(--dashboard-danger)" name="Support load" radius={[8, 8, 0, 0]} />
          </BarChart>
        </div>
      </section>

      <table className="sr-only">
        <caption>KPI trend fallback values</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Revenue</th>
            <th scope="col">Active rides</th>
            <th scope="col">Utilization</th>
            <th scope="col">Support load</th>
          </tr>
        </thead>
        <tbody>
          {trends.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{point.revenue}</td>
              <td>{point.activeRides}</td>
              <td>{point.utilization}</td>
              <td>{point.supportLoad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
