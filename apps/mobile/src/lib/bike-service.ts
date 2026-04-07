import { bikeService, createHttpBikeService, type BikeService } from "@glide/api";

import { getApiBaseUrl } from "./api-base-url";
import { getMobileAccessToken } from "./supabase";

const apiBaseUrl = getApiBaseUrl();

export const configuredBikeService: BikeService =
  apiBaseUrl && apiBaseUrl.length > 0
    ? createHttpBikeService({ baseUrl: apiBaseUrl, getAccessToken: getMobileAccessToken })
    : bikeService;
