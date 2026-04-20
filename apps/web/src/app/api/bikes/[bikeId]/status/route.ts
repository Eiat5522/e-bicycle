import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import type { BikeStatus } from "@glide/shared";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const allowedStatuses = new Set<BikeStatus>(["available", "reserved", "in_use", "maintenance"]);

type BikeUpdateStatusBody = {
  readonly status?: string;
};

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bikeId: string }> | { bikeId: string } }
) {
  let bikeId: string;

  try {
    ({ bikeId } = await readContextParams(context));
  } catch {
    return NextResponse.json({ message: "Bike identifier is required." }, { status: 400 });
  }

  let payload: BikeUpdateStatusBody;

  try {
    payload = (await request.json()) as BikeUpdateStatusBody;
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!allowedStatuses.has(payload.status as BikeStatus)) {
    return NextResponse.json({ message: "Bike status is invalid." }, { status: 400 });
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

  const { data: currentBike, error: currentBikeError } = await supabase
    .from("bikes")
    .select("id, status, active_rider_id")
    .eq("id", bikeId)
    .maybeSingle();

  if (currentBikeError) {
    return NextResponse.json({ message: currentBikeError.message }, { status: 500 });
  }

  if (!currentBike) {
    return NextResponse.json({ message: "Bike not found." }, { status: 404 });
  }

  const isStartingRide = payload.status === "in_use";
  const isEndingRide = payload.status === "available";
  const isReserving = payload.status === "reserved";
  const isMaintenance = payload.status === "maintenance";

  if (isStartingRide) {
    if (currentBike.status === "in_use" && currentBike.active_rider_id !== currentUserId) {
      return NextResponse.json(
        { message: "This bike is already in use by another rider." },
        { status: 409 }
      );
    }
  }

  if (isEndingRide && currentBike.active_rider_id !== currentUserId) {
    return NextResponse.json(
      { message: "Only the active rider can end this ride." },
      { status: 403 }
    );
  }

  if (isReserving && currentBike.status !== "available") {
    return NextResponse.json(
      { message: "Only available bikes can be reserved." },
      { status: 409 }
    );
  }

  if (isMaintenance && currentBike.status === "in_use") {
    return NextResponse.json(
      { message: "Cannot set in-use bike to maintenance." },
      { status: 409 }
    );
  }

  const updateValues: Database["public"]["Tables"]["bikes"]["Update"] = {
    status: payload.status as BikeStatus,
    active_rider_id: isStartingRide ? currentUserId : null,
    last_reported_at: new Date().toISOString()
  };

  let updateQuery = supabase
    .from("bikes")
    .update(updateValues)
    .eq("id", bikeId)
    .eq("status", currentBike.status);

  if (currentBike.active_rider_id === null) {
    updateQuery = updateQuery.is("active_rider_id", null);
  } else {
    updateQuery = updateQuery.eq("active_rider_id", currentBike.active_rider_id);
  }

  const { data, error } = await updateQuery.select("id, status, active_rider_id").maybeSingle();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { message: "Bike state changed. Please retry." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    activeRiderId: data.active_rider_id,
    bikeId: data.id,
    status: data.status
  });
}
