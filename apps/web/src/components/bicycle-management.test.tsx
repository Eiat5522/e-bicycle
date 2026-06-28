import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SideDrawer } from "@/components/side-drawer";

import {
  BicycleEditor,
  BicycleManagementList,
  type BikeRideHistoryEntry,
  type ManagedBike
} from "./bicycle-management";

const mockRouterBack = jest.fn();

jest.mock("react", () => jest.requireActual("react"));

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    readonly children: ReactNode;
    readonly href: string;
    readonly scroll?: boolean;
  }) {
    const anchorProps = { ...props };
    delete anchorProps.scroll;

    return (
      <a href={href} {...anchorProps}>
        {children}
      </a>
    );
  };
});

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    back: mockRouterBack
  }))
}));

const bike: ManagedBike = {
  id: "G-205",
  model: "Glide Urban",
  rideClass: "City",
  topSpeedKmh: 32,
  pricingLabel: "฿15 / 30 min",
  ratePerMinute: 0.5,
  status: "available",
  activeRiderId: null,
  activeRiderLabel: null,
  location: "Silom Station",
  latitude: 13.7262,
  longitude: 100.5291,
  lastReportedAt: "2026-04-14T10:00:00.000Z",
  imageUrl: null,
  createdAt: "2026-04-01T10:00:00.000Z",
  updatedAt: "2026-04-14T10:00:00.000Z"
};

const rideHistory: readonly BikeRideHistoryEntry[] = [];

const rideWithRoute = {
  id: "ride-history-1",
  startedAt: "2026-04-04T10:15:00.000Z",
  completedAt: "2026-04-04T10:41:00.000Z",
  durationSec: 1560,
  distanceKm: 3.4,
  totalCost: 4.8,
  ratePerMinute: 0.1846,
  billableMinutes: 26,
  currencyCode: "THB",
  walletTransactionId: "txn-1",
  fareCalculationMethod: "ceil_minutes_v1",
  co2SavedKg: 0.9,
  startLocation: "Asok Interchange",
  endLocation: "Benjakitti Park",
  routeLabel: "Asok Interchange to Benjakitti Park",
  paymentLabel: "Charged to Visa **** 4242",
  route: [
    { latitude: 13.7372, longitude: 100.5606 },
    { latitude: 13.7354, longitude: 100.5544 },
    { latitude: 13.7319, longitude: 100.5459 }
  ],
  checkpoints: [
    {
      id: "ride-history-1-start",
      label: "Unlock",
      description: "Bike unlocked near the BTS exit.",
      coordinates: { latitude: 13.7372, longitude: 100.5606 },
      elapsedSec: 0
    },
    {
      id: "ride-history-1-end",
      label: "Drop-off",
      description: "Ride ended at the park gate station.",
      coordinates: { latitude: 13.7319, longitude: 100.5459 },
      elapsedSec: 1560
    }
  ]
} satisfies BikeRideHistoryEntry;

const rideWithoutRoute = {
  ...rideWithRoute,
  id: "ride-history-empty",
  routeLabel: "Route without telemetry",
  route: [],
  checkpoints: []
} satisfies BikeRideHistoryEntry;

describe("BicycleEditor", () => {
  it("falls back when an uploaded bicycle image fails to load", () => {
    render(
      <BicycleEditor
        action={jest.fn(async () => undefined)}
        bike={{
          ...bike,
          imageUrl: "https://storage.example.com/missing-bike.webp"
        }}
        mode="edit"
        rideHistory={rideHistory}
      />
    );

    fireEvent.error(screen.getByAltText("Glide Urban"));

    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
    expect(screen.getByText("Glide Urban media preview")).toBeInTheDocument();
  });

  it("submits edits and exits edit mode after a successful update", async () => {
    const onUpdateBike = jest.fn(async () => undefined);

    render(
      <BicycleEditor
        action={onUpdateBike}
        bike={bike}
        mode="edit"
        rideHistory={rideHistory}
      />
    );

    const modelInput = screen.getByRole("textbox", { name: "Model" });
    expect(modelInput).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Edit Bicycle" }));
    expect(modelInput).toBeEnabled();

    fireEvent.change(modelInput, { target: { value: "Glide Urban Pro" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onUpdateBike).toHaveBeenCalledTimes(1));

    const submittedCall = onUpdateBike.mock.calls[0] as [FormData] | undefined;
    expect(submittedCall).toBeDefined();

    const [submittedFormData] = submittedCall!;
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get("bikeId")).toBe(bike.id);
    expect(submittedFormData.get("model")).toBe("Glide Urban Pro");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit Bicycle" })).toBeInTheDocument();
    });

    expect(screen.getByText("Bicycle saved successfully.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Model" })).toBeDisabled();
  });

  it("shows only one cancel button while editing in the drawer", () => {
    render(
      <BicycleEditor
        action={jest.fn(async () => undefined)}
        bike={bike}
        mode="edit"
        rideHistory={rideHistory}
        variant="drawer"
      />
    );

    expect(screen.getByRole("button", { name: "Close editor for Glide Urban" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit Bicycle" }));

    expect(screen.getAllByRole("button", { name: "Cancel" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Close bicycle editor" })).not.toBeInTheDocument();
  });

  it("requires confirmation before deleting a bicycle", async () => {
    const onDeleteBike = jest.fn(async () => undefined);

    render(
      <BicycleEditor
        action={jest.fn(async () => undefined)}
        bike={bike}
        deleteAction={onDeleteBike}
        mode="edit"
        rideHistory={rideHistory}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Bicycle" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Bicycle" }));

    expect(onDeleteBike).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Delete Glide Urban?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));

    expect(screen.queryByRole("alertdialog", { name: "Delete Glide Urban?" })).not.toBeInTheDocument();
    expect(onDeleteBike).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete Bicycle" })).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Bicycle" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Glide Urban" }));

    await waitFor(() => expect(onDeleteBike).toHaveBeenCalledTimes(1));

    const submittedCall = onDeleteBike.mock.calls[0] as [FormData] | undefined;
    expect(submittedCall).toBeDefined();
    expect(submittedCall![0].get("bikeId")).toBe(bike.id);
  });

  it("keeps delete confirmation escape handling inside the drawer", async () => {
    render(
      <SideDrawer ariaLabel={`Edit bicycle ${bike.model}`}>
        <BicycleEditor
          action={jest.fn(async () => undefined)}
          bike={bike}
          deleteAction={jest.fn(async () => undefined)}
          mode="edit"
          rideHistory={rideHistory}
          variant="drawer"
        />
      </SideDrawer>
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit Bicycle" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Bicycle" }));

    const cancelDeletionButton = screen.getByRole("button", { name: "Cancel deletion" });
    expect(cancelDeletionButton).toHaveFocus();

    fireEvent.keyDown(cancelDeletionButton, { key: "Escape" });

    expect(screen.queryByRole("alertdialog", { name: "Delete Glide Urban?" })).not.toBeInTheDocument();
    expect(mockRouterBack).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete Bicycle" })).toHaveFocus();
    });
  });

  it("expands a route map and lets admins inspect ride checkpoints", () => {
    render(
      <BicycleEditor
        action={jest.fn(async () => undefined)}
        bike={bike}
        mode="edit"
        rideHistory={[rideWithRoute]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "View route for Asok Interchange to Benjakitti Park" }));

    expect(screen.getByRole("img", { name: "Route map for Asok Interchange to Benjakitti Park" })).toBeInTheDocument();
    expect(screen.getByTestId("leaflet-route-map")).toHaveAttribute("data-map-provider", "leaflet");
    expect(screen.getByRole("button", { name: "Play replay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide route for Asok Interchange to Benjakitti Park" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop-off checkpoint, 26 min" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Drop-off checkpoint, 26 min" }));

    expect(screen.getByText("Ride ended at the park gate station.")).toBeInTheDocument();
  });

  it("keeps only one ride route map expanded at a time", () => {
    const secondRide = {
      ...rideWithRoute,
      id: "ride-history-2",
      routeLabel: "Silom lunch loop",
      startLocation: "Silom Complex",
      endLocation: "Lumphini Park West Gate"
    } satisfies BikeRideHistoryEntry;

    render(
      <BicycleEditor
        action={jest.fn(async () => undefined)}
        bike={bike}
        mode="edit"
        rideHistory={[rideWithRoute, secondRide]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "View route for Asok Interchange to Benjakitti Park" }));
    expect(screen.getByRole("img", { name: "Route map for Asok Interchange to Benjakitti Park" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View route for Silom lunch loop" }));

    expect(screen.queryByRole("img", { name: "Route map for Asok Interchange to Benjakitti Park" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Route map for Silom lunch loop" })).toBeInTheDocument();
  });

  it("shows a route unavailable state for ride records without route coordinates", () => {
    render(
      <BicycleEditor
        action={jest.fn(async () => undefined)}
        bike={bike}
        mode="edit"
        rideHistory={[rideWithoutRoute]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "View route for Route without telemetry" }));

    expect(screen.getByText("Route unavailable")).toBeInTheDocument();
    expect(screen.getByText("This ride record does not include coordinate telemetry yet.")).toBeInTheDocument();
  });
});

describe("BicycleManagementList", () => {
  it("renders a fleet empty state", () => {
    render(<BicycleManagementList bikes={[]} rideCounts={{}} />);

    expect(screen.getByRole("heading", { name: "No bicycles yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add Bicycle" })).toHaveAttribute("href", "/bicycles/new");
  });

  it("falls back when a bicycle card image fails to load", () => {
    render(
      <BicycleManagementList
        bikes={[
          {
            ...bike,
            imageUrl: "https://storage.example.com/broken-card-image.webp"
          }
        ]}
        rideCounts={{
          [bike.id]: 0
        }}
      />
    );

    fireEvent.error(screen.getByAltText("Glide Urban"));

    expect(screen.getByText("Image unavailable")).toBeInTheDocument();
  });
});
