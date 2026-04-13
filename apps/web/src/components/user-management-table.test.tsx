import { render, screen } from "@testing-library/react";

import { UserManagementTable } from "./user-management-table";

jest.mock("@/app/(admin)/actions", () => ({
  updateUserAction: jest.fn()
}));

describe("UserManagementTable", () => {
  it("renders editable profile rows", () => {
    render(
      <UserManagementTable
        users={[
          {
            id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02",
            firstName: "Taylor",
            isAdmin: true,
            createdAt: "2026-04-13T10:30:00.000Z",
            updatedAt: "2026-04-13T12:15:00.000Z"
          }
        ]}
      />
    );

    expect(screen.getByText("Manage admin access and profile names.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Taylor")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin access")).toBeChecked();
  });
});
