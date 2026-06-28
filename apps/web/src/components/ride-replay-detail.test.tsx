import { render, screen } from "@testing-library/react";

import { RideReplayDetail, type RideReplayDetailViewModel } from "./ride-replay-detail";

const replay: RideReplayDetailViewModel = {
  id: "ride-1",
  bikeId: "G-205",
  bikeModel: "Glide Urban",
  profileId: "user-1",
  riderLabel: "Mali",
  startedAt: "2026-04-22T02:30:00.000Z",
  completedAt: "2026-04-22T02:42:00.000Z",
  durationSec: 720,
  distanceKm: 2.4,
  totalCost: 1.2,
  ratePerMinute: 0.1,
  billableMinutes: 12,
  currencyCode: "THB",
  walletTransactionId: "txn-ride-1",
  fareCalculationMethod: "ceil_minutes_v1",
  co2SavedKg: 0.5,
  startLocation: "Asok Interchange",
  endLocation: "Benjakitti Park Drop-off",
  dropOffContext: "Benjakitti Park Drop-off",
  routeLabel: "Asok to Benjakitti",
  paymentLabel: "Charged to Glide wallet",
  route: [
    { latitude: 13.7372, longitude: 100.5606 },
    { latitude: 13.7295, longitude: 100.5601 }
  ],
  checkpoints: [
    {
      id: "ride-1-start",
      label: "Unlock",
      description: "Ride started at the Asok rack.",
      coordinates: { latitude: 13.7372, longitude: 100.5606 },
      elapsedSec: 0
    },
    {
      id: "ride-1-dropoff",
      label: "Drop-off",
      description: "Bike was returned inside the Benjakitti Park drop-off zone.",
      coordinates: { latitude: 13.7295, longitude: 100.5601 },
      elapsedSec: 720
    }
  ]
};

describe("RideReplayDetail", () => {
  it("renders route, checkpoints, fare details, and drop-off context", () => {
    render(<RideReplayDetail replay={replay} />);

    expect(screen.getByRole("heading", { name: "Asok to Benjakitti" })).toBeInTheDocument();
    expect(screen.getByText("G-205 · Glide Urban")).toBeInTheDocument();
    expect(screen.getByText("Mali")).toBeInTheDocument();
    expect(screen.getByText("Benjakitti Park Drop-off")).toBeInTheDocument();
    expect(screen.getByText("12 billable min")).toBeInTheDocument();
    expect(screen.getByText("ceil_minutes_v1")).toBeInTheDocument();
    expect(screen.getByText("Bike was returned inside the Benjakitti Park drop-off zone.")).toBeInTheDocument();
    expect(screen.getByTestId("leaflet-route-map")).toBeInTheDocument();
  });
});
