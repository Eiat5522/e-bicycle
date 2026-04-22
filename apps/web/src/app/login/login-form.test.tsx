import { render, screen } from "@testing-library/react";

import { LoginFormCard } from "./login-form";
import { initialLoginFormState } from "./login-form-state";

describe("LoginFormCard", () => {
  it("renders admin-specific guidance and validation messages", () => {
    render(
      <LoginFormCard
        formAction={jest.fn()}
        pending={false}
        state={{
          ...initialLoginFormState,
          errors: {
            email: "Enter a valid email address."
          },
          message: "Admin access is required to use this panel."
        }}
      />
    );

    expect(screen.getByText("Admin sign in")).toBeInTheDocument();
    expect(screen.getByText("This panel only accepts accounts with admin rights in Supabase.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Admin access is required to use this panel.")).toBeInTheDocument();
  });

  it("renders the pending submit state", () => {
    render(
      <LoginFormCard formAction={jest.fn()} pending={true} state={initialLoginFormState} />
    );

    expect(screen.getByRole("button", { name: "Checking access..." })).toBeDisabled();
  });

  it("renders the password validation message without a global message", () => {
    render(
      <LoginFormCard
        formAction={jest.fn()}
        pending={false}
        state={{
          ...initialLoginFormState,
          errors: {
            password: "Enter your password."
          }
        }}
      />
    );

    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(
      screen.queryByText("Admin access is required to use this panel.")
    ).not.toBeInTheDocument();
  });
});
