import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

let supabaseClient: SupabaseClient | undefined;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
    const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!supabaseUrl || !supabasePublishableKey) {
      throw new Error(
        "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required."
      );
    }

    supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: processLock,
        persistSession: true,
        ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {})
      }
    });
  }

  return supabaseClient;
}

export async function getMobileAccessToken() {
  const {
    data: { session }
  } = await getSupabaseClient().auth.getSession();

  return session?.access_token;
}
