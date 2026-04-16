import { redirect } from "next/navigation";

import { signInAction } from "./actions";
import { initialLoginFormState } from "./login-form-state";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { validateLoginForm } from "@/lib/validation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn()
}));

jest.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: jest.fn()
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn()
}));

jest.mock("@/lib/validation", () => ({
  validateLoginForm: jest.fn()
}));

const redirectMock = jest.mocked(redirect);
const getSupabaseConfigMock = jest.mocked(getSupabaseConfig);
const createClientMock = jest.mocked(createClient);
const validateLoginFormMock = jest.mocked(validateLoginForm);

function createSignInClient(overrides?: {
  readonly getUserResult?: {
    readonly data: { readonly user: { readonly id: string } | null };
    readonly error: { readonly message: string } | null;
  };
  readonly profileResult?: {
    readonly data: { readonly is_admin: boolean } | null;
    readonly error: { readonly message: string } | null;
  };
  readonly signInError?: { readonly message: string } | null;
}) {
  const signOut = jest.fn().mockResolvedValue(undefined);
  const maybeSingle = jest.fn().mockResolvedValue(
    overrides?.profileResult ?? {
      data: { is_admin: true },
      error: null
    }
  );

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue(
        overrides?.getUserResult ?? {
          data: { user: { id: "user-1" } },
          error: null
        }
      ),
      signInWithPassword: jest.fn().mockResolvedValue({
        error: overrides?.signInError ?? null
      }),
      signOut
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle
        }))
      }))
    }))
  };
}

describe("signInAction", () => {
  const validValues = {
    email: "admin@rideglide.app",
    password: "secret"
  };

  beforeEach(() => {
    getSupabaseConfigMock.mockReturnValue({
      supabasePublishableKey: "test-key",
      supabaseUrl: "https://example.supabase.co"
    });
    validateLoginFormMock.mockReturnValue({
      errors: {},
      values: validValues
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns validation feedback before hitting Supabase", async () => {
    validateLoginFormMock.mockReturnValue({
      errors: {
        email: "Enter a valid email address."
      },
      values: validValues
    });

    await expect(signInAction(initialLoginFormState, new FormData())).resolves.toEqual({
      errors: {
        email: "Enter a valid email address."
      },
      message: "Enter a valid email and password.",
      values: validValues
    });

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("returns a configuration message when Supabase env vars are missing", async () => {
    getSupabaseConfigMock.mockImplementation(() => {
      throw new Error("Supabase is not configured.");
    });

    await expect(signInAction(initialLoginFormState, new FormData())).resolves.toEqual({
      ...initialLoginFormState,
      message: "Supabase is not configured.",
      values: validValues
    });
  });

  it("returns a generic credentials error when sign-in fails", async () => {
    const client = createSignInClient({
      signInError: { message: "Invalid login credentials" }
    });
    createClientMock.mockResolvedValue(client as never);

    await expect(signInAction(initialLoginFormState, new FormData())).resolves.toEqual({
      errors: {},
      message: "Email or password is incorrect.",
      values: {
        email: validValues.email,
        password: ""
      }
    });
  });

  it("signs out and reports a broken auth session", async () => {
    const client = createSignInClient({
      getUserResult: {
        data: { user: null },
        error: { message: "Auth session missing!" }
      }
    });
    createClientMock.mockResolvedValue(client as never);

    await expect(signInAction(initialLoginFormState, new FormData())).resolves.toEqual({
      errors: {},
      message: "Unable to verify your session. Try again.",
      values: {
        email: validValues.email,
        password: ""
      }
    });

    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it("throws unexpected user lookup failures", async () => {
    const client = createSignInClient({
      getUserResult: {
        data: { user: { id: "user-1" } },
        error: { message: "User lookup failed." }
      }
    });
    createClientMock.mockResolvedValue(client as never);

    await expect(signInAction(initialLoginFormState, new FormData())).rejects.toThrow(
      "User lookup failed."
    );
  });

  it("signs out when the user is not an admin", async () => {
    const client = createSignInClient({
      profileResult: {
        data: { is_admin: false },
        error: null
      }
    });
    createClientMock.mockResolvedValue(client as never);

    await expect(signInAction(initialLoginFormState, new FormData())).resolves.toEqual({
      errors: {},
      message: "Admin access is required to use this panel.",
      values: {
        email: validValues.email,
        password: ""
      }
    });

    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it("signs out when the admin profile lookup fails", async () => {
    const client = createSignInClient({
      profileResult: {
        data: null,
        error: { message: "Profile fetch failed." }
      }
    });
    createClientMock.mockResolvedValue(client as never);

    await expect(signInAction(initialLoginFormState, new FormData())).resolves.toEqual({
      errors: {},
      message: "Admin access is required to use this panel.",
      values: {
        email: validValues.email,
        password: ""
      }
    });

    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it("redirects admins to the home page", async () => {
    const client = createSignInClient();
    createClientMock.mockResolvedValue(client as never);

    await signInAction(initialLoginFormState, new FormData());

    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
