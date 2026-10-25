describe("getSupabaseConfig", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it("returns trimmed Supabase credentials when configured", async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " test-key ",
      NEXT_PUBLIC_SUPABASE_URL: " https://example.supabase.co "
    };

    const { getSupabaseConfig, hasSupabaseConfig } = await import("./config");

    expect(hasSupabaseConfig).toBe(true);
    expect(getSupabaseConfig()).toEqual({
      supabasePublishableKey: "test-key",
      supabaseUrl: "https://example.supabase.co"
    });
  });

  it("throws when either Supabase credential is missing", async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co"
    };

    const { getSupabaseConfig, hasSupabaseConfig } = await import("./config");

    expect(hasSupabaseConfig).toBe(false);
    expect(() => getSupabaseConfig()).toThrow(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  });
});
