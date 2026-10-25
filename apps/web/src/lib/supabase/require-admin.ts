import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "./admin";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export function createAuthenticatedClient(request: Request) {
  const { supabasePublishableKey, supabaseUrl } = getSupabaseConfig();
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Missing authentication token.");
  }

  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authorization },
    },
  });
}

export async function requireAdmin(request: Request) {
  let authClient;
  try {
    authClient = createAuthenticatedClient(request);
  } catch (err) {
    return { error: NextResponse.json({ message: "Authentication is required." }, { status: 401 }) };
  }

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ message: "Authentication is required." }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load admin profile.", profileError);
    return { error: NextResponse.json({ message: "Unable to verify admin access." }, { status: 500 }) };
  }

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ message: "Admin access is required." }, { status: 403 }) };
  }

  return { userId: user.id };
}
