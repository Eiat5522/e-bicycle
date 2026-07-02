describe("createAdminClient", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it("mentions the service role key when the admin URL is missing", async () => {
    process.env = {
      ...originalEnv,
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key"
    };

    const { createAdminClient } = await import("./admin");

    expect(() => createAdminClient()).toThrow(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  });
});
