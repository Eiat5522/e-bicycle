import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

jest.mock("recharts", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockChartComponent = ({ children }: { readonly children?: ReactNode }) =>
    React.createElement("div", null, children);

  return {
    Bar: MockChartComponent,
    BarChart: MockChartComponent,
    CartesianGrid: MockChartComponent,
    Legend: MockChartComponent,
    Line: MockChartComponent,
    LineChart: MockChartComponent,
    Tooltip: MockChartComponent,
    XAxis: MockChartComponent,
    YAxis: MockChartComponent
  };
});

import { AdminShell } from "./admin-shell";

describe("AdminShell", () => {
  it("renders the executive scorecard by default", () => {
    render(<AdminShell />);

    expect(screen.getByRole("tab", { name: "Executive Scorecard" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Operations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Executive Scorecard" })).toBeInTheDocument();
    expect(screen.getByText("Wallet float")).toBeInTheDocument();
    expect(screen.getByText("Tracked revenue")).toBeInTheDocument();
    expect(screen.getAllByText("Active rides")[0]).toBeInTheDocument();
    expect(screen.getByText("Demand and revenue trend chart")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Performance against target" })).not.toBeInTheDocument();
  });

  it("switches to the operations dashboard without losing existing modules", () => {
    render(<AdminShell />);

    fireEvent.click(screen.getByRole("tab", { name: "Operations" }));

    expect(screen.getByRole("tab", { name: "Operations" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Executive Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Live operations snapshot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Performance against target" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Route revenue by recent rides" })).toBeInTheDocument();
    expect(screen.getByText("Revenue per completed ride")).toBeInTheDocument();
    expect(screen.getByText("Active rider")).toBeInTheDocument();
    expect(screen.getByText("Currently in use by Alex")).toBeInTheDocument();
  });

  it("renders fallback operational copy when optional activity data is missing", async () => {
    jest.resetModules();

    await jest.isolateModulesAsync(async () => {
      jest.doMock("@glide/api", () => ({
        mockActiveRide: {
          bikeId: "G-001",
          currentCost: 3.25,
          distanceKm: 1.2,
          nextDropoffZoneKm: 0,
          startLocation: "Depot"
        },
        mockAdminOverview: {
          activeRides: 0,
          openSupportSessions: 0,
          walletBalanceTotal: 0
        },
        mockExecutiveKpiSummary: {
          headlineMetrics: [
            {
              label: "Wallet float",
              value: "฿0.00",
              delta: "0%",
              deltaTone: "neutral",
              detail: "No mocked wallet float.",
              trendKey: "revenue"
            }
          ],
          trends: [
            {
              activeRides: 0,
              label: "Now",
              revenue: 0,
              supportLoad: 0,
              utilization: 0
            }
          ],
          insights: []
        },
        mockBikes: [
          {
            estimatedRangeKm: 12,
            id: "G-001",
            lastReportedAt: "2026-04-13T00:00:00.000Z",
            location: "Depot",
            model: "Glide Mini",
            status: "maintenance"
          }
        ],
        mockNearbyBikesResult: {
          serverTime: "2026-04-13T00:00:00.000Z"
        },
        mockRideHistory: [],
        mockWallet: {
          paymentMethods: [],
          transactions: []
        }
      }));
      jest.doMock("@glide/shared", () => {
        const actual = jest.requireActual("@glide/shared");

        return {
          ...actual,
          formatDistanceKm: (distanceKm: number) =>
            Number.isFinite(distanceKm) && distanceKm >= 0 ? actual.formatDistanceKm(distanceKm) : "0.0 km",
          formatDuration: (durationSec: number) =>
            Number.isFinite(durationSec) && durationSec >= 0 ? actual.formatDuration(durationSec) : "0 min"
        };
      });

      const { OperationsDashboard: FallbackOperationsDashboard } = await import("./operations-dashboard");

      render(<FallbackOperationsDashboard />);

      expect(screen.getByText(/drop-off zone status pending\./)).toBeInTheDocument();
      expect(screen.getByText(/Wallet update recorded for/)).toBeInTheDocument();
      expect(screen.getByText(/No route closed at/)).toBeInTheDocument();
      expect(screen.getByText("No recent event")).toBeInTheDocument();
      expect(screen.getByText("No recent completion")).toBeInTheDocument();
    });
  });
});
