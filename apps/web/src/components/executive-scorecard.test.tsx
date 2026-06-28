import { render, screen } from "@testing-library/react";

jest.mock("./kpi-trend-charts", () => ({
  KpiTrendCharts: () => {
    const React = jest.requireActual<typeof import("react")>("react");

    return React.createElement("div", { "data-testid": "kpi-trend-charts" });
  }
}));

import { ExecutiveScorecard } from "./executive-scorecard";
import {
  selectExecutiveScorecardViewModel,
  type DashboardInput
} from "@/app/(admin)/dashboard/selectors";

const emptyInput: DashboardInput = {
  bikes: [],
  profiles: [],
  rideHistory: [],
  serverTime: "2026-06-28T09:30:00Z",
  walletTransactions: [],
  wallets: []
};

describe("ExecutiveScorecard", () => {
  it("renders empty states when no live rows are available", () => {
    render(<ExecutiveScorecard data={selectExecutiveScorecardViewModel(emptyInput)} />);

    expect(screen.getByText("No live metrics yet")).toBeInTheDocument();
    expect(screen.getByText("No trend data yet")).toBeInTheDocument();
    expect(screen.getByText("No insights available")).toBeInTheDocument();
  });
});
