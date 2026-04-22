"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import { ExecutiveScorecard } from "./executive-scorecard";
import { OperationsDashboard } from "./operations-dashboard";

type DashboardTheme = CSSProperties & Record<`--${string}`, string>;
type DashboardTab = "executive" | "operations";

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

const tabs: readonly {
  readonly id: DashboardTab;
  readonly label: string;
  readonly panelId: string;
}[] = [
  { id: "executive", label: "Executive Scorecard", panelId: "executive-scorecard-panel" },
  { id: "operations", label: "Operations", panelId: "operations-dashboard-panel" }
];

export function AdminShell() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("executive");

  return (
    <section className="flex flex-col gap-6" style={dashboardTheme}>
      <div
        aria-label="Dashboard views"
        className="clay-card flex flex-wrap gap-2 p-2"
        role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              aria-controls={tab.panelId}
              aria-selected={isActive}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-[var(--dashboard-accent)] text-white shadow-sm"
                  : "text-[var(--dashboard-ink-muted)] hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)]"
              ].join(" ")}
              id={`${tab.id}-dashboard-tab`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button">
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "executive" ? (
        <div
          aria-labelledby="executive-dashboard-tab"
          id="executive-scorecard-panel"
          role="tabpanel"
          tabIndex={0}>
          <ExecutiveScorecard />
        </div>
      ) : (
        <div
          aria-labelledby="operations-dashboard-tab"
          id="operations-dashboard-panel"
          role="tabpanel"
          tabIndex={0}>
          <OperationsDashboard />
        </div>
      )}
    </section>
  );
}
