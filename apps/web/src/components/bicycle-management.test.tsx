jest.mock("react", () => jest.requireActual("@testing-library/react/node_modules/react"));

import type { ReactNode } from "react";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BicycleEditor, type BikeRideHistoryEntry, type ManagedBike } from "./bicycle-management";

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
  useRouter: jest.fn(() => ({
    back: jest.fn()
  }))
}));

const bike: ManagedBike = {
  id: "G-205",
  model: "Glide Urban",
  rideClass: "City",
  topSpeedKmh: 32,
  pricingLabel: "฿15 / 30 min",
  status: "available",
  location: "Silom Station",
  latitude: 13.7262,
  longitude: 100.5291,
  lastReportedAt: "2026-04-14T10:00:00.000Z",
  imageUrl: null,
  createdAt: "2026-04-01T10:00:00.000Z",
  updatedAt: "2026-04-14T10:00:00.000Z"
};

const rideHistory: readonly BikeRideHistoryEntry[] = [];

describe("BicycleEditor", () => {
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
});
