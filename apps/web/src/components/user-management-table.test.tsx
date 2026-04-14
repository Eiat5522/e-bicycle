jest.mock("react", () => jest.requireActual("@testing-library/react/node_modules/react"));

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { initialUserUpdateFormState } from "@/app/(admin)/user-update-form-state";

import { UserDetailDrawerContent, UserManagementTable } from "./user-management-table";

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

  it("renders empty states for users without rides or transactions", () => {
    render(
      <UserDetailDrawerContent
        activeTab="transactions"
        onClose={jest.fn()}
        onSelectTab={jest.fn()}
        onUpdateUser={jest.fn()}
        user={{
          ...user,
          rideHistory: [],
          transactions: []
        }}
      />
    );

    expect(
      screen.getByText("No transaction history is available for this account yet.")
    ).toBeInTheDocument();
  });

  it("calls its tab and close handlers", () => {
    const onClose = jest.fn();
    const onSelectTab = jest.fn();

    render(
      <UserDetailDrawerContent
        activeTab="transactions"
        onClose={onClose}
        onSelectTab={onSelectTab}
        onUpdateUser={jest.fn()}
        user={user}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ride History" }));
    fireEvent.click(screen.getByRole("button", { name: "Transaction History" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onSelectTab).toHaveBeenCalledWith("rides");
    expect(onSelectTab).toHaveBeenCalledWith("transactions");
    expect(onClose).toHaveBeenCalled();
  });

  it("renders edit controls when editor state is provided", () => {
    const firstNameRef = { current: null };
    const isAdminRef = { current: null };

    render(
      <UserDetailDrawerContent
        activeTab="transactions"
        editorControls={{
          firstNameRef,
          hasChanges: true,
          isAdminRef,
          isEditing: true,
          isPending: true,
          submitMessage: "Could not save user profile.",
          onCancelEditing: jest.fn(),
          onCheckForChanges: jest.fn()
        }}
        onClose={jest.fn()}
        onSelectTab={jest.fn()}
        onUpdateUser={jest.fn()}
        user={user}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(screen.getByText("Could not save user profile.")).toBeInTheDocument();
  });
});

describe("UserManagementTable", () => {
  it("opens and closes the selected user drawer from the table", () => {
    render(<UserManagementTable onUpdateUser={jest.fn()} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(screen.getByRole("dialog", { name: "User details for Taylor" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close user details" }));
    expect(screen.queryByRole("dialog", { name: "User details for Taylor" })).not.toBeInTheDocument();
  });

  it("submits edits and exits edit mode after a successful update", async () => {
    const onUpdateUser = jest.fn(async () => ({
      status: "success" as const,
      message: "User updated."
    }));

    render(<UserManagementTable onUpdateUser={onUpdateUser} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const displayNameInput = screen.getByRole("textbox", { name: "Display name" });
    const adminCheckbox = screen.getByRole("checkbox", { name: "Admin access" });
    const saveButton = screen.getByRole("button", { name: "Save" });

    expect(displayNameInput).toBeEnabled();
    expect(adminCheckbox).toBeEnabled();
    expect(saveButton).toBeDisabled();

    fireEvent.change(displayNameInput, { target: { value: "Jordan" } });
    expect(saveButton).toBeEnabled();

    fireEvent.submit(displayNameInput.closest("form")!);

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalledTimes(1));

    const [previousState, submittedFormData] = onUpdateUser.mock.calls[0];
    expect(previousState).toEqual(initialUserUpdateFormState);
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get("userId")).toBe(user.id);
    expect(submittedFormData.get("firstName")).toBe("Jordan");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
    expect(screen.getByRole("textbox", { name: "Display name" })).toBeDisabled();
  });

  it("shows the returned error message when an update fails", async () => {
    const onUpdateUser = jest.fn(async () => ({
      status: "error" as const,
      message: "Display name is required."
    }));

    render(<UserManagementTable onUpdateUser={onUpdateUser} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Display name" }), {
      target: { value: "" }
    });

    fireEvent.submit(screen.getByRole("textbox", { name: "Display name" }).closest("form")!);

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Display name is required.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("cancels edits and restores the original field values", () => {
    render(
      <UserManagementTable
        onUpdateUser={jest.fn()}
        users={[
          user,
          {
            ...user,
            id: "5e66a7ec-2fea-4f7d-9f79-5bd3cf4f2054",
            firstName: "Morgan",
            isAdmin: false,
            transactions: [],
            rideHistory: []
          }
        ]}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "View details" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const displayNameInput = screen.getByRole("textbox", { name: "Display name" }) as HTMLInputElement;
    const adminCheckbox = screen.getByRole("checkbox", { name: "Admin access" }) as HTMLInputElement;

    fireEvent.change(displayNameInput, { target: { value: "Morgan Prime" } });
    fireEvent.click(adminCheckbox);

    expect(displayNameInput.value).toBe("Morgan Prime");
    expect(adminCheckbox.checked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(displayNameInput.value).toBe("Morgan");
    expect(adminCheckbox.checked).toBe(false);
    expect(displayNameInput).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
