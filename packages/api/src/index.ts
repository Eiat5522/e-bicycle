import type {
  AdminOverview,
  Bike,
  NearbyBikesQuery,
  NearbyBikesResult,
  Ride,
  RideHistoryItem,
  RideSummary,
  SupportSession,
  UnlockPhase,
  UnlockRequest,
  UnlockResult,
  User,
  Wallet
} from "@glide/shared";

export interface AuthService {
  getCurrentUser(): Promise<User>;
  signIn(email: string): Promise<User>;
}

export interface BikeService {
  listNearby(query: NearbyBikesQuery): Promise<NearbyBikesResult>;
  getById(id: string): Promise<Bike | undefined>;
}

export interface RideService {
  getActiveRide(): Promise<Ride>;
  getRideSummary(): Promise<RideSummary>;
}

export interface UnlockService {
  startUnlock(request: UnlockRequest): Promise<UnlockResult>;
}

export interface WalletService {
  getWallet(): Promise<Wallet>;
}

export interface SupportService {
  startSession(mode?: SupportSession["mode"]): Promise<SupportSession>;
}

export const mockUser: User = {
  id: "user-alex",
  firstName: "Alex",
  email: "alex@rideglide.app"
};

export const mockBikes: readonly Bike[] = [
  {
    id: "G-104",
    model: "Glide Pro X",
    rideClass: "Pro",
    estimatedRangeKm: 45,
    topSpeedKmh: 25,
    pricingLabel: "$1.20 / 10 min",
    status: "available",
    location: "Siam Square",
    coordinates: { latitude: 13.7466, longitude: 100.5328 },
    lastReportedAt: "2026-04-06T08:55:00Z"
  },
  {
    id: "G-205",
    model: "Glide City",
    rideClass: "City",
    estimatedRangeKm: 31,
    topSpeedKmh: 22,
    pricingLabel: "$0.90 / 10 min",
    status: "in_use",
    location: "อโศก Interchange",
    coordinates: { latitude: 13.7372, longitude: 100.5606 },
    lastReportedAt: "2026-04-06T08:56:00Z"
  },
  {
    id: "G-318",
    model: "Glide Lite",
    rideClass: "Urban",
    estimatedRangeKm: 28,
    topSpeedKmh: 20,
    pricingLabel: "$0.80 / 10 min",
    status: "available",
    location: "Ari Soi 1",
    coordinates: { latitude: 13.7797, longitude: 100.5446 },
    lastReportedAt: "2026-04-06T08:58:00Z"
  },
  {
    id: "G-412",
    model: "Glide Cargo",
    rideClass: "Cargo",
    estimatedRangeKm: 36,
    topSpeedKmh: 20,
    pricingLabel: "$1.40 / 10 min",
    status: "available",
    location: "Lumphini Park West Gate",
    coordinates: { latitude: 13.7305, longitude: 100.5418 },
    lastReportedAt: "2026-04-06T08:57:00Z"
  },
  {
    id: "G-509",
    model: "Glide Metro",
    rideClass: "City",
    estimatedRangeKm: 33,
    topSpeedKmh: 23,
    pricingLabel: "$1.00 / 10 min",
    status: "available",
    location: "Silom Complex",
    coordinates: { latitude: 13.7286, longitude: 100.5345 },
    lastReportedAt: "2026-04-06T08:54:00Z"
  },
  {
    id: "G-620",
    model: "Glide Street+",
    rideClass: "Pro",
    estimatedRangeKm: 47,
    topSpeedKmh: 25,
    pricingLabel: "$1.20 / 10 min",
    status: "available",
    location: "Phrom Phong BTS",
    coordinates: { latitude: 13.7301, longitude: 100.5697 },
    lastReportedAt: "2026-04-06T08:59:00Z"
  }
];

export const mockNearbyBikesResult: NearbyBikesResult = {
  bikes: mockBikes,
  serverTime: "2026-04-06T09:00:00Z",
  searchCenter: { latitude: 13.7563, longitude: 100.5018 }
};

export const mockActiveRide: Ride = {
  id: "ride-8821",
  bikeId: "G-205",
  status: "active",
  durationSec: 750,
  distanceKm: 2.4,
  currentCost: 3.5,
  startLocation: "อโศก Interchange",
  nextDropoffZoneKm: 1.2
};

export const mockRideSummary: RideSummary = {
  rideId: "ride-8821",
  totalCost: 4.25,
  distanceKm: 3.1,
  co2SavedKg: 0.8,
  routeLabel: "อโศก to Benjakitti Park"
};

const benjakittiCommuteRoute: RideHistoryItem["route"] = [
  { latitude: 13.7372, longitude: 100.5606 },
  { latitude: 13.7365, longitude: 100.5577 },
  { latitude: 13.7354, longitude: 100.5544 },
  { latitude: 13.7342, longitude: 100.5511 },
  { latitude: 13.7328, longitude: 100.5482 },
  { latitude: 13.7319, longitude: 100.5459 }
];

const silomLunchRoute: RideHistoryItem["route"] = [
  { latitude: 13.7286, longitude: 100.5345 },
  { latitude: 13.7294, longitude: 100.5364 },
  { latitude: 13.7306, longitude: 100.5392 },
  { latitude: 13.7321, longitude: 100.5415 },
  { latitude: 13.7336, longitude: 100.5438 },
  { latitude: 13.7352, longitude: 100.5457 }
];

const ariEveningRoute: RideHistoryItem["route"] = [
  { latitude: 13.7797, longitude: 100.5446 },
  { latitude: 13.7779, longitude: 100.5431 },
  { latitude: 13.7758, longitude: 100.5418 },
  { latitude: 13.7734, longitude: 100.5408 },
  { latitude: 13.7706, longitude: 100.5399 },
  { latitude: 13.7678, longitude: 100.5388 }
];

function getRoutePoint(route: RideHistoryItem["route"], index: number) {
  const point = route[index];

  if (!point) {
    throw new Error(`Missing mocked ride route point at index ${index}`);
  }

  return point;
}

export const mockRideHistory: readonly RideHistoryItem[] = [
  {
    id: "ride-history-1",
    bikeId: "G-205",
    bikeModel: "Glide City",
    startedAt: "2026-04-04T10:15:00Z",
    completedAt: "2026-04-04T10:41:00Z",
    durationSec: 1560,
    distanceKm: 3.4,
    totalCost: 4.8,
    co2SavedKg: 0.9,
    startLocation: "อโศก Interchange",
    endLocation: "Benjakitti Park",
    routeLabel: "อโศก Interchange to Benjakitti Park",
    paymentLabel: "Charged to Visa **** 4242",
    route: benjakittiCommuteRoute,
    checkpoints: [
      {
        id: "ride-history-1-start",
        label: "Unlock",
        description: "Bike unlocked near the BTS exit.",
        coordinates: getRoutePoint(benjakittiCommuteRoute, 0),
        elapsedSec: 0
      },
      {
        id: "ride-history-1-mid",
        label: "Queen Sirikit turn",
        description: "Joined the park connector lane.",
        coordinates: getRoutePoint(benjakittiCommuteRoute, 3),
        elapsedSec: 820
      },
      {
        id: "ride-history-1-end",
        label: "Drop-off",
        description: "Ride ended at the park gate station.",
        coordinates: getRoutePoint(benjakittiCommuteRoute, 5),
        elapsedSec: 1560
      }
    ]
  },
  {
    id: "ride-history-2",
    bikeId: "G-509",
    bikeModel: "Glide Metro",
    startedAt: "2026-04-02T05:30:00Z",
    completedAt: "2026-04-02T05:50:00Z",
    durationSec: 1200,
    distanceKm: 2.6,
    totalCost: 3.95,
    co2SavedKg: 0.6,
    startLocation: "Silom Complex",
    endLocation: "Lumphini Park West Gate",
    routeLabel: "Silom lunch loop",
    paymentLabel: "Charged to Visa **** 4242",
    route: silomLunchRoute,
    checkpoints: [
      {
        id: "ride-history-2-start",
        label: "Unlock",
        description: "Started outside Silom Complex.",
        coordinates: getRoutePoint(silomLunchRoute, 0),
        elapsedSec: 0
      },
      {
        id: "ride-history-2-mid",
        label: "Rama IV crossing",
        description: "Crossed into the protected lane segment.",
        coordinates: getRoutePoint(silomLunchRoute, 2),
        elapsedSec: 560
      },
      {
        id: "ride-history-2-end",
        label: "Drop-off",
        description: "Ended close to the west gate bike rack.",
        coordinates: getRoutePoint(silomLunchRoute, 5),
        elapsedSec: 1200
      }
    ]
  },
  {
    id: "ride-history-3",
    bikeId: "G-318",
    bikeModel: "Glide Lite",
    startedAt: "2026-03-31T11:05:00Z",
    completedAt: "2026-03-31T11:38:00Z",
    durationSec: 1980,
    distanceKm: 4.1,
    totalCost: 5.3,
    co2SavedKg: 1.1,
    startLocation: "Ari Soi 1",
    endLocation: "Victory Monument",
    routeLabel: "Ari Soi 1 to Victory Monument",
    paymentLabel: "Charged to Visa **** 4242",
    route: ariEveningRoute,
    checkpoints: [
      {
        id: "ride-history-3-start",
        label: "Unlock",
        description: "Started from the Ari station cluster.",
        coordinates: getRoutePoint(ariEveningRoute, 0),
        elapsedSec: 0
      },
      {
        id: "ride-history-3-mid",
        label: "Phaya Thai link",
        description: "Passed the dedicated connector lane.",
        coordinates: getRoutePoint(ariEveningRoute, 3),
        elapsedSec: 1040
      },
      {
        id: "ride-history-3-end",
        label: "Drop-off",
        description: "Ended near the Victory Monument ring.",
        coordinates: getRoutePoint(ariEveningRoute, 5),
        elapsedSec: 1980
      }
    ]
  }
];

export function getRideHistoryById(id: string): RideHistoryItem | undefined {
  return mockRideHistory.find((ride) => ride.id === id);
}

export const mockWallet: Wallet = {
  balance: 24.5,
  points: 120,
  paymentMethods: ["Visa **** 4242"],
  transactions: [
    {
      id: "txn-1",
      type: "ride",
      title: "Ride to Downtown",
      subtitle: "Oct 24, 2023 • 14 mins",
      amount: -4.2,
      timestamp: "2023-10-24T12:00:00Z"
    },
    {
      id: "txn-2",
      type: "top_up",
      title: "Wallet Top-Up",
      subtitle: "Oct 22, 2023 • Visa **** 4242",
      amount: 20,
      timestamp: "2023-10-22T12:00:00Z"
    }
  ]
};

export const mockAdminOverview: AdminOverview = {
  activeBikes: mockBikes.length,
  activeRides: 1,
  openSupportSessions: 2,
  walletBalanceTotal: 1240.75
};

export const authService: AuthService = {
  async getCurrentUser() {
    return mockUser;
  },
  async signIn() {
    return mockUser;
  }
};

export const bikeService: BikeService = {
  async listNearby() {
    return mockNearbyBikesResult;
  },
  async getById(id) {
    return mockBikes.find((bike) => bike.id === id);
  }
};

interface CreateHttpBikeServiceOptions {
  readonly baseUrl: string;
  readonly fetchImpl?: FetchLike;
}

interface HttpResponseLike {
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}

type FetchLike = (input: string) => Promise<HttpResponseLike>;

export function createHttpBikeService({
  baseUrl,
  fetchImpl = async (input) => {
    if (typeof globalThis.fetch !== "function") {
      throw new Error("Global fetch is not available in this runtime.");
    }

    return (await globalThis.fetch(input)) as HttpResponseLike;
  }
}: CreateHttpBikeServiceOptions): BikeService {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return {
    async listNearby(query) {
      const searchParams = new URLSearchParams({
        lat: query.latitude.toString(),
        lng: query.longitude.toString(),
        radius: query.radiusMeters.toString()
      });

      if (query.limit !== undefined) {
        searchParams.append("limit", query.limit.toString());
      }

      const response = await fetchImpl(
        `${normalizedBaseUrl}/bikes/nearby?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch nearby bikes: ${response.status}`);
      }

      return (await response.json()) as NearbyBikesResult;
    },
    async getById(id) {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/bikes/${encodeURIComponent(id)}`
      );

      if (response.status === 404) {
        return undefined;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch bike: ${response.status}`);
      }

      return (await response.json()) as Bike;
    }
  };
}

export const rideService: RideService = {
  async getActiveRide() {
    return mockActiveRide;
  },
  async getRideSummary() {
    return mockRideSummary;
  }
};

export const unlockService: UnlockService = {
  async startUnlock(request) {
    const phases: UnlockPhase[] =
      request.method === "qr"
        ? [
            {
              status: "scanning",
              label: "Align QR code",
              description: `Point your camera at the QR on ${request.bikeId}.`
            },
            {
              status: "authorizing",
              label: "Authorizing unlock",
              description: "Checking the bike code and validating your rental session."
            },
            {
              status: "unlocking",
              label: "Releasing lock",
              description: "Sending the unlock command to the bike."
            }
          ]
        : [
            {
              status: "connecting",
              label: "Searching for bike",
              description: `Looking for ${request.bikeId} over Bluetooth.`
            },
            {
              status: "authorizing",
              label: "Pairing securely",
              description: "Creating a temporary secure session with the lock controller."
            },
            {
              status: "unlocking",
              label: "Releasing lock",
              description: "Sending the unlock command to the bike."
            }
          ];

    const successMessage =
      request.method === "qr"
        ? `${request.bikeId} verified. You're ready to ride.`
        : `${request.bikeId} connected over Bluetooth. You're ready to ride.`;

    const failureMessage =
      request.method === "qr"
        ? "The QR code could not be verified. Move closer and scan again."
        : "The bike did not answer over Bluetooth. Move closer and try again.";

    const result: UnlockResult = {
      bikeId: request.bikeId,
      method: request.method,
      attempt: request.attempt,
      phases,
      finalStatus: request.attempt === 1 ? "failed" : "success",
      successMessage
    };

    if (request.attempt === 1) {
      return {
        ...result,
        failureMessage
      };
    }

    return result;
  }
};

export const walletService: WalletService = {
  async getWallet() {
    return mockWallet;
  }
};

export const supportService: SupportService = {
  async startSession(mode = "chatbot") {
    return {
      id: "support-1",
      mode,
      status: mode === "chatbot" ? "open" : "escalated"
    };
  }
};
