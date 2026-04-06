import { render, screen } from "@testing-library/react";

import { AdminShell } from "./admin-shell";

describe("AdminShell", () => {
  it("renders shared dashboard metrics", () => {
    render(<AdminShell />);

    expect(screen.getByText("Glide Admin")).toBeInTheDocument();
    expect(screen.getByText("Active bikes")).toBeInTheDocument();
    expect(screen.getByText("$1,240.75")).toBeInTheDocument();
  });
});
