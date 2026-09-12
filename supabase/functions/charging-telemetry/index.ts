/// <reference types="https://esm.sh/@supabase/functions-js@2" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ChargingLogPayload {
  battery_id: string;
  station_id?: string;
  charging_slot_id?: string;
  status: "charging" | "completed" | "swapped";
  voltage?: number;
  current_amp?: number;
  temperature_c?: number;
  state_of_health?: number;
  swap_from_battery_id?: string;
  swap_to_battery_id?: string;
}

const allowedStatuses = new Set<ChargingLogPayload["status"]>(["charging", "completed", "swapped"]);

function badRequest(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function optionalNonnegativeNumber(value: unknown, field: string): number | null | Response {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return badRequest(`${field} must be a nonnegative number.`);
  }

  return value;
}

function optionalFiniteNumber(value: unknown, field: string): number | null | Response {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return badRequest(`${field} must be a number.`);
  }

  return value;
}

function validateChargingLogPayload(value: unknown): ChargingLogPayload | Response {
  if (!isRecord(value)) {
    return badRequest("Request body must be a JSON object.");
  }

  const batteryId = optionalString(value.battery_id);
  if (!batteryId) {
    return badRequest("battery_id is required.");
  }

  if (typeof value.status !== "string" || !allowedStatuses.has(value.status as ChargingLogPayload["status"])) {
    return badRequest("status must be one of charging, completed, or swapped.");
  }

  const voltage = optionalNonnegativeNumber(value.voltage, "voltage");
  if (voltage instanceof Response) return voltage;

  const currentAmp = optionalNonnegativeNumber(value.current_amp, "current_amp");
  if (currentAmp instanceof Response) return currentAmp;

  const temperatureC = optionalFiniteNumber(value.temperature_c, "temperature_c");
  if (temperatureC instanceof Response) return temperatureC;

  const stateOfHealth = optionalNonnegativeNumber(value.state_of_health, "state_of_health");
  if (stateOfHealth instanceof Response) return stateOfHealth;
  if (stateOfHealth !== null && stateOfHealth > 100) {
    return badRequest("state_of_health must be between 0 and 100.");
  }

  return {
    battery_id: batteryId,
    station_id: optionalString(value.station_id),
    charging_slot_id: optionalString(value.charging_slot_id),
    status: value.status as ChargingLogPayload["status"],
    voltage: voltage ?? undefined,
    current_amp: currentAmp ?? undefined,
    temperature_c: temperatureC ?? undefined,
    state_of_health: stateOfHealth ?? undefined,
    swap_from_battery_id: optionalString(value.swap_from_battery_id),
    swap_to_battery_id: optionalString(value.swap_to_battery_id),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: profile, error: profileError } = await supabaseAnon
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access: admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let parsedBody: unknown;
    try {
      parsedBody = await req.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const payload = validateChargingLogPayload(parsedBody);
    if (payload instanceof Response) return payload;

    const { data, error } = await supabase
      .from("battery_charging_logs")
      .insert({
        battery_id: payload.battery_id,
        station_id: payload.station_id ?? null,
        charging_slot_id: payload.charging_slot_id ?? null,
        status: payload.status,
        voltage: payload.voltage ?? null,
        current_amp: payload.current_amp ?? null,
        temperature_c: payload.temperature_c ?? null,
        state_of_health: payload.state_of_health ?? null,
        swap_from_battery_id: payload.swap_from_battery_id ?? null,
        swap_to_battery_id: payload.swap_to_battery_id ?? null,
        started_at: payload.status === "charging" ? new Date().toISOString() : null,
        completed_at: payload.status === "completed" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ battery_charging_log: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
