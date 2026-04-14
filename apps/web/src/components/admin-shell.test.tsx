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

      const { AdminShell: FallbackAdminShell } = await import("./admin-shell");

      render(<FallbackAdminShell />);

      expect(screen.getByText(/drop-off zone status pending\./)).toBeInTheDocument();
      expect(screen.getByText(/Wallet update recorded for/)).toBeInTheDocument();
      expect(screen.getByText(/No route closed at/)).toBeInTheDocument();
      expect(screen.getByText("No recent event")).toBeInTheDocument();
      expect(screen.getByText("No recent completion")).toBeInTheDocument();
    });
  });
});
