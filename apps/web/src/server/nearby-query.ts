import { ApiError } from "./api-errors";

const DEFAULT_RADIUS_METERS = 1500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export function parseNearbyBikesQuery(url: string) {
  const searchParams = new URL(url).searchParams;
  const latitude = parseRequiredNumber(searchParams, "lat");
  const longitude = parseRequiredNumber(searchParams, "lng");
  const radiusMeters = parseOptionalNumber(searchParams, "radius") ?? DEFAULT_RADIUS_METERS;
  const limit = Math.min(
    parseOptionalInteger(searchParams, "limit") ?? DEFAULT_LIMIT,
    MAX_LIMIT
  );

  if (radiusMeters <= 0) {
    throw new ApiError("radius must be greater than 0.", 400);
  }

  if (limit <= 0) {
    throw new ApiError("limit must be greater than 0.", 400);
  }

  return {
    latitude,
    longitude,
    radiusMeters,
    limit
  };
}

function parseRequiredNumber(searchParams: URLSearchParams, key: string) {
  const value = parseOptionalNumber(searchParams, key);

  if (value === undefined) {
    throw new ApiError(`${key} is required.`, 400);
  }

  return value;
}

function parseOptionalNumber(searchParams: URLSearchParams, key: string) {
  const rawValue = searchParams.get(key);

  if (rawValue === null) {
    return undefined;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    throw new ApiError(`${key} must be a number.`, 400);
  }

  return value;
}

function parseOptionalInteger(searchParams: URLSearchParams, key: string) {
  const value = parseOptionalNumber(searchParams, key);

  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value)) {
    throw new ApiError(`${key} must be an integer.`, 400);
  }

  return value;
}
