import { NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@supabase/supabase-js";

type GeofenceCheckBody = {
  readonly latitude: number;
  readonly longitude: number;
};

function createAuthenticatedClient(request: Request) {
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

export async function POST(
  request: Request,
  _context: unknown = {},
) {
  let client: ReturnType<typeof createClient<Database>>;

  try {
    client = createAuthenticatedClient(request);
  } catch {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  }

  let body: GeofenceCheckBody;
  try {
    body = (await request.json()) as GeofenceCheckBody;
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
    return NextResponse.json(
      { message: "latitude and longitude are required numbers." },
      { status: 400 },
    );
  }

  const { data, error: rpcError } = await client.rpc("check_service_area", {
    p_latitude: body.latitude,
    p_longitude: body.longitude,
  });

  if (rpcError) {
    return NextResponse.json({ message: rpcError.message }, { status: 500 });
  }

  const inside = Array.isArray(data) && data.length > 0;

  return NextResponse.json({
    inside,
    serviceArea: inside ? data[0] : null,
  });
}
