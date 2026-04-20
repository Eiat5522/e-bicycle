describe("configuredBikeStatusService", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("updates bike status through the API base URL", async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200
    });

    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com";
    }

    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    const { configuredBikeStatusService } = jest.requireActual("./bike-status-service") as typeof import("./bike-status-service");

    await configuredBikeStatusService.updateBikeStatus({
      bikeId: "G-205",
      status: "in_use",
      accessToken: "session-token"
    });

    expect(fetchSpy).toHaveBeenCalledWith("https://api.example.com/bikes/G-205/status", {
      body: JSON.stringify({ status: "in_use" }),
      headers: {
        Authorization: "Bearer session-token",
        "Content-Type": "application/json"
      },
      method: "PATCH",
      signal: expect.any(AbortSignal)
    });
  });

  it("aborts the request after the timeout and surfaces a friendly error", async () => {
    jest.useFakeTimers();
    try {
      const fetchSpy = jest.fn((_url, options?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("The operation was aborted."), { name: "AbortError" }));
          });
        });
      });

      const env = (
        globalThis as typeof globalThis & {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env;

      if (env) {
        env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com";
      }

      globalThis.fetch = fetchSpy as typeof globalThis.fetch;

      const { configuredBikeStatusService } = jest.requireActual("./bike-status-service") as typeof import("./bike-status-service");

      const updatePromise = configuredBikeStatusService.updateBikeStatus({
        bikeId: "G-205",
        status: "in_use",
        accessToken: "session-token"
      });
      const assertion = expect(updatePromise).rejects.toThrow("Request timed out while updating bike status.");

      await jest.advanceTimersByTimeAsync(10_000);

      await assertion;
      expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
        signal: expect.any(AbortSignal)
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("fails fast when the API base URL is not configured", async () => {
    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      delete env.EXPO_PUBLIC_API_BASE_URL;
    }

    const { configuredBikeStatusService } = jest.requireActual("./bike-status-service") as typeof import("./bike-status-service");

    await expect(
      configuredBikeStatusService.updateBikeStatus({
        bikeId: "G-205",
        status: "available",
        accessToken: "session-token"
      })
    ).rejects.toThrow("EXPO_PUBLIC_API_BASE_URL is required to sync bike status changes.");
  });
});
