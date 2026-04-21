import type { ReactNode } from "react";

import { render, screen, within } from "@testing-library/react";

import HomePage from "./page";

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

describe("HomePage", () => {
  it("renders bento shortcuts that mirror the admin navigation", () => {
    render(<HomePage />);

    const shortcuts = screen.getAllByRole("link");

    expect(screen.getByRole("heading", { name: "Choose an admin workspace." })).toBeInTheDocument();
    expect(shortcuts.map((shortcut) => shortcut.getAttribute("href"))).toEqual([
      "/dashboard",
      "/users",
      "/bicycles"
    ]);
    expect(within(shortcuts[0]!).getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(within(shortcuts[1]!).getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(within(shortcuts[2]!).getByRole("heading", { name: "Bicycles" })).toBeInTheDocument();
  });
});
