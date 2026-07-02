import { render, screen } from "@testing-library/react";

import HomePage from "./page";

jest.mock("./dashboard/data", () => ({
  loadDashboardViewModels: jest.fn()
}));

jest.mock("../../components/kpi-trend-charts", () => ({
  KpiTrendCharts: () => {
    const React = jest.requireActual<typeof import("react")>("react");

    return React.createElement("div", { "data-testid": "kpi-trend-charts" });
  }
}));

import { loadDashboardViewModels, type DashboardViewModels } from "./dashboard/data";

const loadDashboardViewModelsMock = jest.mocked(loadDashboardViewModels);

function createDashboardViewModels(): DashboardViewModels {
  return {
    executive: {
      headlineMetrics: [
        {
          delta: "+8%",
          deltaTone: "positive" as const,
          detail: "Wallet balances remain healthy across the current reporting window.",
          label: "Wallet float",
          trendKey: "revenue" as const,
          value: "฿42.50"
        }
      ],
      insights: [],
      refreshedAtLabel: "just now",
      reportingWindowLabel: "Last 7 days",
      trends: []
    },
    operations: {
      activeRide: null,
      averageCompletedRideRevenue: 1.62,
      averageFleetRangeKm: 35,
      averageRideDistanceKm: 3.2,
      averageRideDurationSec: 1080,
      completedRevenue: 1.62,
      fleetBreakdown: [],
      lastSyncLabel: "just now",
      paymentMethodsCount: 2,
      recentRoutes: [],
      summaryMetrics: [],
      targetMetrics: [],
      totalBikes: 1,
      availableBikes: 1,
      activityFeed: [],
      watchlist: []
    }
  };
}

describe("HomePage", () => {
  beforeEach(() => {
    loadDashboardViewModelsMock.mockResolvedValue(createDashboardViewModels());
  });

  it("renders live dashboard content instead of shortcut cards", async () => {
    render(await HomePage());

    expect(screen.getByRole("heading", { name: "Executive Scorecard" })).toBeInTheDocument();
    expect(screen.getByText("Wallet float")).toBeInTheDocument();
    expect(screen.getByText("฿42.50")).toBeInTheDocument();
  });
});
