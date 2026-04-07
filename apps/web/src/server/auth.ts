import "server-only";

import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

import { ApiError } from "./api-errors";

function getSupabaseConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new ApiError("Supabase server environment is not configured.", 500);
  }

  return { supabasePublishableKey, supabaseUrl };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError("Missing bearer token.", 401);
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    throw new ApiError("Missing bearer token.", 401);
  }

  return token;
}

export async function requireSupabaseUser(request: Request): Promise<SupabaseUser> {
  const { supabasePublishableKey, supabaseUrl } = getSupabaseConfig();
  const token = getBearerToken(request);
  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiError("Invalid bearer token.", 401);
  }

  return user;
}
