import { render, screen } from "@testing-library/react";

import { AdminShell } from "./admin-shell";

describe("AdminShell", () => {
  it("renders the executive dashboard modules", () => {
    render(<AdminShell />);

    expect(screen.getByText("Executive Dashboard")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Live operations snapshot" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Performance against target" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Route revenue by recent rides" })).toBeInTheDocument();
    expect(screen.getByText("Revenue per completed ride")).toBeInTheDocument();
  });
});
