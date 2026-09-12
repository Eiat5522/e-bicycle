/// <reference types="https://esm.sh/@supabase/functions-js@2" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EnergyPayload {
  station_id: string;
  total_power_demand_kw: number;
  phase_l1_kw?: number;
  phase_l2_kw?: number;
  phase_l3_kw?: number;
  tou_rate_period?: string;
  applied_tou_rate?: number;
  currency_code?: string;
}

function badRequest(message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function validateEnergyPayload(value: unknown): EnergyPayload | Response {
  if (!isRecord(value)) {
    return badRequest("Request body must be a JSON object.");
  }

  const stationId = typeof value.station_id === "string" ? value.station_id.trim() : "";
  if (!stationId) {
    return badRequest("station_id is required.");
  }

  const totalPowerDemandKw = optionalNonnegativeNumber(value.total_power_demand_kw, "total_power_demand_kw");
  if (totalPowerDemandKw instanceof Response) return totalPowerDemandKw;
  if (totalPowerDemandKw === null) {
    return badRequest("total_power_demand_kw is required.");
  }

  const phaseL1Kw = optionalNonnegativeNumber(value.phase_l1_kw, "phase_l1_kw");
  if (phaseL1Kw instanceof Response) return phaseL1Kw;

  const phaseL2Kw = optionalNonnegativeNumber(value.phase_l2_kw, "phase_l2_kw");
  if (phaseL2Kw instanceof Response) return phaseL2Kw;

  const phaseL3Kw = optionalNonnegativeNumber(value.phase_l3_kw, "phase_l3_kw");
  if (phaseL3Kw instanceof Response) return phaseL3Kw;

  const appliedTouRate = optionalNonnegativeNumber(value.applied_tou_rate, "applied_tou_rate");
  if (appliedTouRate instanceof Response) return appliedTouRate;

  const currencyCode = value.currency_code === undefined || value.currency_code === null
    ? "THB"
    : typeof value.currency_code === "string"
      ? value.currency_code.trim()
      : "";

  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return badRequest("currency_code must be a three-letter uppercase code.");
  }

  return {
    station_id: stationId,
    total_power_demand_kw: totalPowerDemandKw,
    phase_l1_kw: phaseL1Kw ?? undefined,
    phase_l2_kw: phaseL2Kw ?? undefined,
    phase_l3_kw: phaseL3Kw ?? undefined,
    tou_rate_period: typeof value.tou_rate_period === "string" ? value.tou_rate_period : undefined,
    applied_tou_rate: appliedTouRate ?? undefined,
    currency_code: currencyCode,
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

    const payload = validateEnergyPayload(parsedBody);
    if (payload instanceof Response) return payload;

    const { data, error } = await supabase
      .from("energy_management")
      .insert({
        station_id: payload.station_id,
        total_power_demand_kw: payload.total_power_demand_kw,
        phase_l1_kw: payload.phase_l1_kw ?? null,
        phase_l2_kw: payload.phase_l2_kw ?? null,
        phase_l3_kw: payload.phase_l3_kw ?? null,
        tou_rate_period: payload.tou_rate_period ?? null,
        applied_tou_rate: payload.applied_tou_rate ?? null,
        currency_code: payload.currency_code ?? "THB",
        recorded_at: new Date().toISOString(),
        source_system: "station_iot",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ energy_management: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
