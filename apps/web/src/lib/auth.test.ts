import { redirect } from "next/navigation";

import { getAuthContext, requireAdmin } from "./auth";
import { createClient } from "./supabase/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn()
}));

jest.mock("./supabase/config", () => ({
  hasSupabaseConfig: true
}));

jest.mock("./supabase/server", () => ({
  createClient: jest.fn()
}));

const createClientMock = jest.mocked(createClient);
const redirectMock = jest.mocked(redirect);

function createAuthClient(overrides?: {
  readonly getUserResult?: {
    readonly data: { readonly user: { readonly id: string; readonly email?: string | null } | null };
    readonly error: { readonly message: string } | null;
  };
  readonly profileResult?: {
    readonly data:
      | {
          readonly created_at: string;
          readonly first_name: string;
          readonly id: string;
          readonly is_admin: boolean;
          readonly updated_at: string;
        }
      | null;
    readonly error: { readonly message: string } | null;
  };
}) {
  const maybeSingle = jest.fn().mockResolvedValue(
    overrides?.profileResult ?? {
      data: {
        created_at: "2026-04-13T10:30:00.000Z",
        first_name: "Taylor",
        id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02",
        is_admin: true,
        updated_at: "2026-04-13T12:15:00.000Z"
      },
      error: null
    }
  );

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue(
        overrides?.getUserResult ?? {
          data: {
            user: {
              email: "admin@rideglide.app",
              id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02"
            }
          },
          error: null
        }
      )
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

describe("getAuthContext", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when Supabase reports that the auth session is missing", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Auth session missing!" }
        })
      }
    } as never);

    await expect(getAuthContext()).resolves.toBeNull();
  });

  it("throws unexpected Supabase auth errors", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: { message: "Something else failed." }
        })
      }
    } as never);

    await expect(getAuthContext()).rejects.toThrow("Something else failed.");
  });

  it("returns null when no user is signed in", async () => {
    createClientMock.mockResolvedValue(
      createAuthClient({
        getUserResult: {
          data: { user: null },
          error: null
        }
      }) as never
    );

    await expect(getAuthContext()).resolves.toBeNull();
  });

  it("returns the authenticated user and mapped admin profile", async () => {
    createClientMock.mockResolvedValue(createAuthClient() as never);

    await expect(getAuthContext()).resolves.toEqual({
      profile: {
        createdAt: "2026-04-13T10:30:00.000Z",
        firstName: "Taylor",
        id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02",
        isAdmin: true,
        updatedAt: "2026-04-13T12:15:00.000Z"
      },
      user: {
        email: "admin@rideglide.app",
        id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02"
      }
    });
  });

  it("maps a missing email to null and allows a missing profile", async () => {
    createClientMock.mockResolvedValue(
      createAuthClient({
        getUserResult: {
          data: {
            user: {
              email: null,
              id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02"
            }
          },
          error: null
        },
        profileResult: {
          data: null,
          error: null
        }
      }) as never
    );

    await expect(getAuthContext()).resolves.toEqual({
      profile: null,
      user: {
        email: null,
        id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02"
      }
    });
  });

  it("throws when the profile lookup fails", async () => {
    createClientMock.mockResolvedValue(
      createAuthClient({
        profileResult: {
          data: null,
          error: { message: "Profile query failed." }
        }
      }) as never
    );

    await expect(getAuthContext()).rejects.toThrow("Profile query failed.");
  });
});

describe("requireAdmin", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("redirects non-admin users to the login page", async () => {
    createClientMock.mockResolvedValue(
      createAuthClient({
        profileResult: {
          data: {
            created_at: "2026-04-13T10:30:00.000Z",
            first_name: "Taylor",
            id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02",
            is_admin: false,
            updated_at: "2026-04-13T12:15:00.000Z"
          },
          error: null
        }
      }) as never
    );

    await requireAdmin();

    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("returns the admin context for admin users", async () => {
    createClientMock.mockResolvedValue(createAuthClient() as never);

    await expect(requireAdmin()).resolves.toEqual({
      profile: {
        createdAt: "2026-04-13T10:30:00.000Z",
        firstName: "Taylor",
        id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02",
        isAdmin: true,
        updatedAt: "2026-04-13T12:15:00.000Z"
      },
      user: {
        email: "admin@rideglide.app",
        id: "28f0f4fe-58d4-4ac7-9934-1746e91f8f02"
      }
    });
  });

  it("returns null when Supabase config is disabled", async () => {
    jest.resetModules();

    await jest.isolateModulesAsync(async () => {
      jest.doMock("./supabase/config", () => ({
        hasSupabaseConfig: false
      }));
      jest.doMock("./supabase/server", () => ({
        createClient: jest.fn()
      }));

      const authModule = await import("./auth");

      await expect(authModule.requireAdmin()).resolves.toBeNull();
    });
  });
});
