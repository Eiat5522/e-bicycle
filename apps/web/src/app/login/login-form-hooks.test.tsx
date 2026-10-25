const mockUseActionState = jest.fn();

jest.mock("react", () => {
  const actual = jest.requireActual("react");

  return {
    ...actual,
    useActionState: (...args: unknown[]) => mockUseActionState(...args)
  };
});

jest.mock("./actions", () => ({
  signInAction: jest.fn()
}));

import { render, screen } from "@testing-library/react";

import { LoginForm } from "./login-form";
import { initialLoginFormState } from "./login-form-state";
import { signInAction } from "./actions";

describe("LoginForm hook wiring", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("passes useActionState output into the rendered login card", () => {
    const formAction = jest.fn();

    mockUseActionState.mockReturnValue([
      {
        ...initialLoginFormState,
        values: {
          email: "admin@rideglide.app",
          password: ""
        }
      },
      formAction,
      false
    ]);

    render(<LoginForm />);

    expect(mockUseActionState).toHaveBeenCalledWith(signInAction, initialLoginFormState);
    expect(screen.getByDisplayValue("admin@rideglide.app")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });
});
