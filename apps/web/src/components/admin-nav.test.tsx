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
  it("renders Home as the first tab", () => {
    render(<AdminNav />);

    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Home",
      "Dashboard",
      "Users",
      "Bicycles"
    ]);
    expect(links[0]).toHaveAttribute("href", "/");
  });

  it("marks Home active only on the root route", () => {
    jest.mocked(usePathname).mockReturnValue("/");

    render(<AdminNav />);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("marks the current route as active", () => {
    jest.mocked(usePathname).mockReturnValue("/users");

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
