import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";

import type { BikeStatus } from "@glide/shared";

interface BikeRideState {
  readonly status: BikeStatus;
  readonly activeRiderId: string | null;
}

interface RideSessionContextValue {
  readonly bikeRideOverrides: Readonly<Record<string, BikeRideState>>;
  readonly setBikeRideState: (bikeId: string, state: BikeRideState) => void;
}

const fallbackRideSessionContext: RideSessionContextValue = {
  bikeRideOverrides: {},
  setBikeRideState: () => undefined
};

const RideSessionContext = createContext<RideSessionContextValue>(fallbackRideSessionContext);

export function RideSessionProvider({ children }: { readonly children: ReactNode }) {
  const [bikeRideOverrides, setBikeRideOverrides] = useState<Record<string, BikeRideState>>({});

  const setBikeRideState = useCallback((bikeId: string, state: BikeRideState) => {
    setBikeRideOverrides((currentOverrides) => {
      const currentState = currentOverrides[bikeId];

      if (
        currentState?.status === state.status &&
        currentState?.activeRiderId === state.activeRiderId
      ) {
        return currentOverrides;
      }

      return {
        ...currentOverrides,
        [bikeId]: state
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      bikeRideOverrides,
      setBikeRideState
    }),
    [bikeRideOverrides, setBikeRideState]
  );

  return <RideSessionContext.Provider value={value}>{children}</RideSessionContext.Provider>;
}

export function useRideSession() {
  return useContext(RideSessionContext);
}
