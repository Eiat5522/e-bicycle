jest.mock("react", () => jest.requireActual("react"));

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { initialUserCreateFormState } from "@/app/(admin)/user-create-form-state";
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
    expect(screen.getByText("+฿20.00")).toBeInTheDocument();
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
    expect(screen.getByText("-฿4.20")).toBeInTheDocument();
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
    render(<UserManagementTable onCreateUser={jest.fn()} onUpdateUser={jest.fn()} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(screen.getByRole("dialog", { name: "User details for Taylor" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close user details" }));
    expect(screen.queryByRole("dialog", { name: "User details for Taylor" })).not.toBeInTheDocument();
  });

  it("opens and closes the create user drawer", () => {
    render(<UserManagementTable onCreateUser={jest.fn()} onUpdateUser={jest.fn()} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));
    expect(screen.getByRole("dialog", { name: "Create user" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close create user drawer" }));
    expect(screen.queryByRole("dialog", { name: "Create user" })).not.toBeInTheDocument();
  });

  it("submits edits and exits edit mode after a successful update", async () => {
    const onUpdateUser = jest.fn(async () => ({
      status: "success" as const,
      message: "User updated."
    }));

    render(<UserManagementTable onCreateUser={jest.fn()} onUpdateUser={onUpdateUser} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const drawer = screen.getByRole("dialog", { name: "User details for Taylor" });
    const displayNameInput = within(drawer).getByRole("textbox", { name: "Display name" });
    const adminCheckbox = within(drawer).getByRole("checkbox", { name: "Admin access" });
    const saveButton = within(drawer).getByRole("button", { name: "Save" });

    expect(displayNameInput).toBeEnabled();
    expect(adminCheckbox).toBeEnabled();
    expect(saveButton).toBeDisabled();

    fireEvent.change(displayNameInput, { target: { value: "Jordan" } });
    expect(saveButton).toBeEnabled();

    fireEvent.submit(displayNameInput.closest("form")!);

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalledTimes(1));

    const submittedUpdateCall = onUpdateUser.mock.calls[0] as
      | [typeof initialUserUpdateFormState, FormData]
      | undefined;
    expect(submittedUpdateCall).toBeDefined();

    const [previousState, submittedFormData] = submittedUpdateCall!;
    expect(previousState).toEqual(initialUserUpdateFormState);
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get("userId")).toBe(user.id);
    expect(submittedFormData.get("firstName")).toBe("Jordan");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    });
    expect(screen.getByText("User saved successfully.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Display name" })).toBeDisabled();
  });

  it("shows the returned error message when an update fails", async () => {
    const onUpdateUser = jest.fn(async () => ({
      status: "error" as const,
      message: "Display name is required."
    }));

    render(<UserManagementTable onCreateUser={jest.fn()} onUpdateUser={onUpdateUser} users={[user]} />);

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
        onCreateUser={jest.fn()}
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

    const viewDetailsButtons = screen.getAllByRole("button", { name: "View details" });
    expect(viewDetailsButtons[1]).toBeDefined();

    fireEvent.click(viewDetailsButtons[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const drawer = screen.getByRole("dialog", { name: "User details for Morgan" });
    const displayNameInput = within(drawer).getByRole("textbox", {
      name: "Display name"
    }) as HTMLInputElement;
    const adminCheckbox = within(drawer).getByRole("checkbox", {
      name: "Admin access"
    }) as HTMLInputElement;

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

  it("submits the add user form and resets it after success", async () => {
    const onCreateUser = jest.fn(async () => ({
      status: "success" as const,
      message: "User created successfully."
    }));

    render(<UserManagementTable onCreateUser={onCreateUser} onUpdateUser={jest.fn()} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    const drawer = screen.getByRole("dialog", { name: "Create user" });
    const emailInput = within(drawer).getByRole("textbox", { name: "Email address" }) as HTMLInputElement;
    const firstNameInput = within(drawer).getByRole("textbox", { name: "First name" }) as HTMLInputElement;
    const passwordInput = within(drawer).getByLabelText("Temporary password") as HTMLInputElement;
    const adminCheckbox = within(drawer).getByRole("checkbox", { name: "Admin access" }) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "new@rideglide.app" } });
    fireEvent.change(firstNameInput, { target: { value: "Jordan" } });
    fireEvent.change(passwordInput, { target: { value: "super-secret" } });
    fireEvent.click(adminCheckbox);
    fireEvent.submit(within(drawer).getByRole("button", { name: "Create user" }).closest("form")!);

    await waitFor(() => expect(onCreateUser).toHaveBeenCalledTimes(1));

    const submittedCall = onCreateUser.mock.calls[0] as
      | [typeof initialUserCreateFormState, FormData]
      | undefined;
    expect(submittedCall).toBeDefined();

    const [previousState, submittedFormData] = submittedCall!;
    expect(previousState).toEqual(initialUserCreateFormState);
    expect(submittedFormData).toBeInstanceOf(FormData);
    expect(submittedFormData.get("email")).toBe("new@rideglide.app");
    expect(submittedFormData.get("firstName")).toBe("Jordan");
    expect(submittedFormData.get("password")).toBe("super-secret");
    expect(submittedFormData.get("isAdmin")).toBe("on");

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Create user" })).not.toBeInTheDocument();
    });
  });

  it("keeps the create user button disabled until required fields are filled", () => {
    render(<UserManagementTable onCreateUser={jest.fn()} onUpdateUser={jest.fn()} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    const drawer = screen.getByRole("dialog", { name: "Create user" });
    const emailInput = within(drawer).getByRole("textbox", { name: "Email address" });
    const firstNameInput = within(drawer).getByRole("textbox", { name: "First name" });
    const passwordInput = within(drawer).getByLabelText("Temporary password");
    const createButton = within(drawer).getByRole("button", { name: "Create user" });

    expect(createButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "new@rideglide.app" } });
    expect(createButton).toBeDisabled();

    fireEvent.change(firstNameInput, { target: { value: "Jordan" } });
    expect(createButton).toBeDisabled();

    fireEvent.change(passwordInput, { target: { value: "super-secret" } });
    expect(createButton).toBeEnabled();
  });

  it("shows add user errors returned by the action", async () => {
    const onCreateUser = jest.fn(async () => ({
      status: "error" as const,
      message: "Enter a valid email address."
    }));

    render(<UserManagementTable onCreateUser={onCreateUser} onUpdateUser={jest.fn()} users={[user]} />);

    fireEvent.click(screen.getByRole("button", { name: "Add user" }));

    const drawer = screen.getByRole("dialog", { name: "Create user" });

    fireEvent.change(within(drawer).getByRole("textbox", { name: "Email address" }), {
      target: { value: "bad-email" }
    });
    fireEvent.change(within(drawer).getByRole("textbox", { name: "First name" }), {
      target: { value: "Jordan" }
    });
    fireEvent.change(within(drawer).getByLabelText("Temporary password"), {
      target: { value: "super-secret" }
    });

    fireEvent.submit(within(drawer).getByRole("button", { name: "Create user" }).closest("form")!);

    await waitFor(() => expect(onCreateUser).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  });
});
