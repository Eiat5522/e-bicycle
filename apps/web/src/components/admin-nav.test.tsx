import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";

import { AdminNav } from "./admin-nav";

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    readonly children: ReactNode;
    readonly href: string;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/users")
}));

describe("AdminNav", () => {
  it("marks the current route as active", () => {
    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the bicycles tab active on nested bicycle routes", () => {
    jest.mocked(usePathname).mockReturnValue("/bicycles/G-205");

    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Bicycles" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
