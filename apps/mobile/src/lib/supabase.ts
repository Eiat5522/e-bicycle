import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import type { Database } from "./supabase.types";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getWebLocalStorage() {
  const webGlobal = globalThis as typeof globalThis & {
    readonly localStorage?: WebStorageLike;
  };

  if (!webGlobal.localStorage) {
    return null;
  }

  return webGlobal.localStorage;
}

const webStorage = {
  getItem(key: string) {
    const storage = getWebLocalStorage();

    if (!storage) {
      return Promise.resolve(null);
    }

    return Promise.resolve(storage.getItem(key));
  },
  setItem(key: string, value: string) {
    const storage = getWebLocalStorage();

    if (storage) {
      storage.setItem(key, value);
    }

    return Promise.resolve();
  },
  removeItem(key: string) {
    const storage = getWebLocalStorage();

    if (storage) {
      storage.removeItem(key);
    }

    return Promise.resolve();
  }
};

export const supabase = createClient<Database>(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabasePublishableKey ?? "placeholder-publishable-key",
  {
    auth: {
      storage: Platform.OS === "web" ? webStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
      lock: processLock
    }
  }
);

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void supabase.auth.startAutoRefresh();
      return;
    }

    void supabase.auth.stopAutoRefresh();
  });
}
