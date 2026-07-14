/// <reference types="https://esm.sh/@supabase/functions-js@2" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EventPayload {
  rental_transaction_id?: string;
  bike_id?: string;
  profile_id?: string;
  event_type: "unlock" | "parking" | "return" | "photo_proof" | "gps_report" | "checkpoint" | "other";
  latitude?: number;
  longitude?: number;
  photo_proof_url?: string;
  metadata?: Record<string, unknown>;
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const payload = (await req.json()) as EventPayload;

    const gpsLocation = payload.latitude != null && payload.longitude != null
      ? `POINT(${payload.longitude} ${payload.latitude})`
      : null;

    const { data, error } = await supabase
      .from("operational_events")
      .insert({
        rental_transaction_id: payload.rental_transaction_id ?? null,
        bike_id: payload.bike_id ?? null,
        profile_id: user.id,
        event_type: payload.event_type,
        gps_location: gpsLocation,
        photo_proof_url: payload.photo_proof_url ?? null,
        metadata: (payload.metadata ?? {}) as Record<string, unknown>,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ operational_event: data }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
