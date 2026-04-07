import { authService, type AuthService } from "@glide/api";
import type { User } from "@glide/shared";

import { getMobileAccessToken } from "./supabase";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const configuredUserService: Pick<AuthService, "getCurrentUser"> =
  apiBaseUrl && apiBaseUrl.length > 0
    ? {
        async getCurrentUser() {
          const accessToken = await getMobileAccessToken();
          const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/me`, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch current user: ${response.status}`);
          }

          return (await response.json()) as User;
        }
      }
    : authService;
