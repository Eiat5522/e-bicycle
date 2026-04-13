import { render, screen } from "@testing-library/react";

import { UserDetailDrawerContent } from "./user-management-table";

const user = {
  id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02",
  firstName: "Taylor",
  isAdmin: true,
  createdAt: "2026-04-13T10:30:00.000Z",
  updatedAt: "2026-04-13T12:15:00.000Z",
  transactions: [
    {
      id: "txn-1",
      type: "top_up" as const,
      title: "Wallet Top-Up",
      subtitle: "Visa **** 4242",
      amount: 20,
      timestamp: "2026-04-13T09:30:00.000Z"
    }
  ],
  rideHistory: [
    {
      id: "ride-1",
      bikeId: "G-205",
      bikeModel: "Glide City",
      startedAt: "2026-04-13T08:00:00.000Z",
      completedAt: "2026-04-13T08:20:00.000Z",
      durationSec: 1200,
      distanceKm: 2.4,
      totalCost: 4.2,
      co2SavedKg: 0.6,
      startLocation: "อโศก Interchange",
      endLocation: "Benjakitti Park",
      routeLabel: "อโศก Interchange to Benjakitti Park",
      paymentLabel: "Charged to Visa **** 4242",
      route: [],
      checkpoints: []
    }
  ]
};

describe("UserDetailDrawerContent", () => {
  it("renders transaction history in the detail drawer", async () => {
    render(
      <UserDetailDrawerContent
        activeTab="transactions"
        isMounted
        onClose={jest.fn()}
        onSelectTab={jest.fn()}
        onUpdateUser={jest.fn()}
        user={user}
      />
    );

    expect(screen.getByRole("dialog", { name: "User details for Taylor" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Transaction History"
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Wallet Top-Up")).toBeInTheDocument();
  });

  it("renders ride history content when the ride tab is active", () => {
    render(
      <UserDetailDrawerContent
        activeTab="rides"
        isMounted
        onClose={jest.fn()}
        onSelectTab={jest.fn()}
        onUpdateUser={jest.fn()}
        user={user}
      />
    );

    expect(screen.getByText("Sample data")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 5,
        name: "อโศก Interchange to Benjakitti Park"
      })
    ).toBeInTheDocument();
  });
});
