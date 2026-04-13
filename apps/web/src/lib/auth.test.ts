import { getAuthContext } from "./auth";
import { createClient } from "./supabase/server";

jest.mock("./supabase/config", () => ({
  hasSupabaseConfig: true
}));

jest.mock("./supabase/server", () => ({
  createClient: jest.fn()
}));

const createClientMock = jest.mocked(createClient);

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
});
