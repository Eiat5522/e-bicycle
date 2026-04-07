import { bikeService, createHttpBikeService, type BikeService } from "@glide/api";

import { getMobileAccessToken } from "./supabase";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

export const configuredBikeService: BikeService =
  apiBaseUrl && apiBaseUrl.length > 0
    ? createHttpBikeService({ baseUrl: apiBaseUrl, getAccessToken: getMobileAccessToken })
    : bikeService;
