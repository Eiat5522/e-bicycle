import { fireEvent, render } from "@testing-library/react";
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
    const { getByRole, getByText, queryByText } = render(
      <AdminShell
        executiveDashboard={<div>Executive panel</div>}
        operationsDashboard={<div>Operations panel</div>}
      />
    );

    expect(getByRole("tab", { name: "Executive Scorecard" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(getByRole("tab", { name: "Operations" })).toBeInTheDocument();
    expect(getByText("Executive panel")).toBeInTheDocument();
    expect(queryByText("Operations panel")).not.toBeInTheDocument();
  });

  it("switches to the operations dashboard without losing existing modules", () => {
    const { getByRole, getByText, queryByText } = render(
      <AdminShell
        executiveDashboard={<div>Executive panel</div>}
        operationsDashboard={<div>Operations panel</div>}
      />
    );

    fireEvent.click(getByRole("tab", { name: "Operations" }));

    expect(getByRole("tab", { name: "Operations" })).toHaveAttribute("aria-selected", "true");
    expect(getByText("Operations panel")).toBeInTheDocument();
    expect(queryByText("Executive panel")).not.toBeInTheDocument();
  });
});
