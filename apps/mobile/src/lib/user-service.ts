import { authService, type AuthService } from "@glide/api";
import type { User } from "@glide/shared";

import { getApiBaseUrl } from "./api-base-url";
import { getMobileAccessToken } from "./supabase";

const apiBaseUrl = getApiBaseUrl();

export const configuredUserService: Pick<AuthService, "getCurrentUser"> =
  apiBaseUrl && apiBaseUrl.length > 0
    ? {
        async getCurrentUser() {
          const accessToken = await getMobileAccessToken();
          const response = await fetch(`${apiBaseUrl}/me`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch current user: ${response.status}`);
          }

          return (await response.json()) as User;
        }
      }
    : authService;
