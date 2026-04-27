import type { Coordinates } from "@glide/shared";

export interface WalkingRouteOption {
  readonly distanceMeters: number;
  readonly durationSec: number;
  readonly label: string;
}

export interface WalkingRouteSummary {
  readonly primaryRoute: WalkingRouteOption;
  readonly alternateRoutes: readonly WalkingRouteOption[];
}

interface MapboxDirectionsRoute {
  readonly distance?: number;
  readonly duration?: number;
  readonly geometry?: unknown;
  readonly legs?: readonly {
    readonly summary?: string;
  }[];
}

interface MapboxDirectionsResponse {
  readonly routes?: readonly MapboxDirectionsRoute[];
}

const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();

function isFiniteNumber(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function getRouteLabel(route: MapboxDirectionsRoute) {
  const summaries =
    route.legs
      ?.map((leg) => leg.summary?.trim())
      .filter((summary): summary is string => Boolean(summary)) ?? [];

  return summaries.join(" • ") || "Recommended walking route";
}

function normalizeRoute(route: MapboxDirectionsRoute): WalkingRouteOption {
  if (!isFiniteNumber(route.distance) || !isFiniteNumber(route.duration)) {
    throw new Error("Mapbox route is missing distance or duration.");
  }

  const distanceMeters = route.distance;
  const durationSec = route.duration;

  return {
    distanceMeters,
    durationSec,
    label: getRouteLabel(route)
  };
}

export function parseMapboxDirectionsResponse(
  response: MapboxDirectionsResponse
): WalkingRouteSummary {
  const routes = response.routes?.map(normalizeRoute) ?? [];

  if (!routes.length) {
    throw new Error("Mapbox directions returned no routes.");
  }

  const [primaryRoute, ...alternateRoutes] = routes;

  if (!primaryRoute) {
    throw new Error("Mapbox directions returned no primary route.");
  }

  return {
    primaryRoute,
    alternateRoutes
  };
}

async function getErrorMessage(response: Response) {
  let text: string;

  try {
    text = await response.text();
  } catch {
    return `Mapbox request failed with status ${response.status}.`;
  }

  try {
    const payload = JSON.parse(text) as { message?: string };
    if (payload?.message) {
      return payload.message;
    }
  } catch {}

  if (text) {
    return text;
  }

  return `Mapbox request failed with status ${response.status}.`;
}

export async function getWalkingRouteSummary({
  origin,
  destination,
  accessToken = mapboxAccessToken,
  fetchImpl = fetch
}: {
  readonly origin: Coordinates;
  readonly destination: Coordinates;
  readonly accessToken?: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<WalkingRouteSummary | null> {
  if (!accessToken) {
    return null;
  }

  try {
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const searchParams = new URLSearchParams({
      access_token: accessToken,
      alternatives: "true",
      geometries: "geojson",
      overview: "simplified",
      steps: "false"
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetchImpl(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?${searchParams.toString()}`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return parseMapboxDirectionsResponse(
      (await response.json()) as MapboxDirectionsResponse
    );
  } catch (error) {
    console.warn("[mapbox-directions] Failed to fetch walking route:", error);
    return null;
  }
}
