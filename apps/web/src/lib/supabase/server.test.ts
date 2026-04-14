import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { createClient } from "./server";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn()
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn()
}));

jest.mock("./config", () => ({
  getSupabaseConfig: jest.fn(() => ({
    supabasePublishableKey: "test-key",
    supabaseUrl: "https://example.supabase.co"
  }))
}));

const createServerClientMock = jest.mocked(createServerClient);
const cookiesMock = jest.mocked(cookies);

describe("createClient", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("creates a server client wired to the Next.js cookie store", async () => {
    const getAll = jest.fn(() => [{ name: "sb-access-token", value: "token" }]);
    const set = jest.fn();

    cookiesMock.mockResolvedValue({ getAll, set } as never);
    createServerClientMock.mockReturnValue({ client: "supabase" } as never);

    const client = await createClient();

    expect(client).toEqual({ client: "supabase" });
    expect(createServerClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "test-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function)
        })
      })
    );

    const options = createServerClientMock.mock.calls[0]?.[2] as
      | {
          cookies: {
            getAll: () => { name: string; value: string }[];
            setAll: (
              cookiesToSet: { name: string; options: { path: string }; value: string }[]
            ) => void;
          };
        }
      | undefined;
    expect(options).toBeDefined();

    expect(options!.cookies.getAll()).toEqual([{ name: "sb-access-token", value: "token" }]);

    options!.cookies.setAll([
      {
        name: "sb-refresh-token",
        options: { path: "/" },
        value: "next-token"
      }
    ]);

    expect(getAll).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith("sb-refresh-token", "next-token", { path: "/" });
  });

  it("swallows cookie mutation errors from server component contexts", async () => {
    cookiesMock.mockResolvedValue({
      getAll: jest.fn(() => []),
      set: jest.fn(() => {
        throw new Error("Cookies cannot be mutated here.");
      })
    } as never);
    createServerClientMock.mockReturnValue({ client: "supabase" } as never);

    await createClient();

    const options = createServerClientMock.mock.calls[0]?.[2] as
      | {
          cookies: {
            setAll: (
              cookiesToSet: { name: string; options: { path: string }; value: string }[]
            ) => void;
          };
        }
      | undefined;
    expect(options).toBeDefined();

    expect(() =>
      options!.cookies.setAll([
        {
          name: "sb-refresh-token",
          options: { path: "/" },
          value: "next-token"
        }
      ])
    ).not.toThrow();
  });
});
