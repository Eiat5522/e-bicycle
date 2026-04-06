import type {
  AdminOverview,
  Bike,
  NearbyBikesQuery,
  NearbyBikesResult,
  Ride,
  RideSummary,
  SupportSession,
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
    location: "Mission District",
    coordinates: { latitude: 37.7599, longitude: -122.4148 },
    lastReportedAt: "2026-04-06T08:55:00Z"
  },
  {
    id: "G-205",
    model: "Glide City",
    rideClass: "City",
    estimatedRangeKm: 31,
    topSpeedKmh: 22,
    pricingLabel: "$0.90 / 10 min",
    status: "available",
    location: "Market Street",
    coordinates: { latitude: 37.7937, longitude: -122.395 },
    lastReportedAt: "2026-04-06T08:56:00Z"
  }
];

export const mockNearbyBikesResult: NearbyBikesResult = {
  bikes: mockBikes,
  serverTime: "2026-04-06T09:00:00Z",
  searchCenter: { latitude: 37.7749, longitude: -122.4194 }
};

export const mockActiveRide: Ride = {
  id: "ride-8821",
  bikeId: "G-104",
  status: "active",
  durationSec: 750,
  distanceKm: 2.4,
  currentCost: 3.5,
  startLocation: "Mission District",
  nextDropoffZoneKm: 1.2
};

export const mockRideSummary: RideSummary = {
  rideId: "ride-8821",
  totalCost: 4.25,
  distanceKm: 3.1,
  co2SavedKg: 0.8,
  routeLabel: "Market St to Embarcadero"
};

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
        searchParams.set("limit", query.limit.toString());
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
