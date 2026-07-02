import Constants from "expo-constants";

import type { BikeStatus } from "@glide/shared";

export interface BikeStatusService {
  updateBikeStatus(input: { bikeId: string; status: BikeStatus; accessToken: string }): Promise<void>;
}

function getDevelopmentApiBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri?.trim();

  if (!hostUri) {
    return null;
  }

  try {
    const hostUrl = hostUri.includes("://") ? new URL(hostUri) : new URL(`http://${hostUri}`);

    return `http://${hostUrl.hostname}:3000/api`;
  } catch {
    return null;
  }
}

function getBikeStatusApiBaseUrl() {
  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  return configuredBaseUrl ? configuredBaseUrl : getDevelopmentApiBaseUrl();
}

function createHttpBikeStatusService(baseUrl: string): BikeStatusService {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const requestTimeoutMs = 10_000;

  return {
    async updateBikeStatus({ bikeId, status, accessToken }) {
      const controller = new global.AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, requestTimeoutMs);

      try {
        const requestInit = {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status }),
          signal: controller.signal
        } as Parameters<typeof fetch>[1];

        const response = await fetch(
          `${normalizedBaseUrl}/bikes/${encodeURIComponent(bikeId)}/status`,
          requestInit
        );

        if (!response.ok) {
          let message = `Failed to update bike status: ${response.status}`;

          try {
            const body = (await response.json()) as { message?: unknown };

            if (typeof body.message === "string" && body.message.length > 0) {
              message = `${body.message} (HTTP ${response.status})`;
            }
          } catch {}

          throw new Error(message);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          throw new Error("Request timed out while updating bike status.");
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  };
}

function createBikeStatusService(): BikeStatusService {
  const apiBaseUrl = getBikeStatusApiBaseUrl();

  if (apiBaseUrl) {
    return createHttpBikeStatusService(apiBaseUrl);
  }

  return {
    async updateBikeStatus() {
      throw new Error("EXPO_PUBLIC_API_BASE_URL is required to sync bike status changes.");
    }
  };
}

export const configuredBikeStatusService = createBikeStatusService();
