import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

async function readContextParams(
  context: { params: Promise<{ bikeId: string }> | { bikeId: string } }
) {
  return Promise.resolve(context.params);
}

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
      persistSession: false
    },
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ bikeId: string }> | { bikeId: string } }
) {
  let bikeId: string;

  try {
    ({ bikeId } = await readContextParams(context));
  } catch {
    return NextResponse.json({ message: "Bike identifier is required." }, { status: 400 });
  }

  let currentUserId: string;

  try {
    const authenticatedClient = createAuthenticatedClient(request);
    const {
      data: { user },
      error
    } = await authenticatedClient.auth.getUser();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
    }

    currentUserId = user.id;
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Authentication failed." },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_admin")
    .eq("id", currentUserId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 500 });
  }

  if (!profile?.is_admin) {
    return NextResponse.json({ message: "Admin access is required." }, { status: 403 });
  }

  const { data: events, error } = await supabase
    .from("bike_status_events")
    .select("id, bike_id, actor_id, from_status, to_status, transition_kind, context, created_at")
    .eq("bike_id", bikeId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bikeId,
    events: (events ?? []).map((event) => ({
      actorId: event.actor_id,
      bikeId: event.bike_id,
      context: event.context,
      createdAt: event.created_at,
      fromStatus: event.from_status,
      id: event.id,
      toStatus: event.to_status,
      transitionKind: event.transition_kind
    }))
  });
}
