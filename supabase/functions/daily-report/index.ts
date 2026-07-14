/// <reference types="https://esm.sh/@supabase/functions-js@2" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing cron secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const today = new Date();
    const periodEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());

    const { data: opReport, error: opError } = await supabase.rpc(
      "generate_operational_report",
      {
        p_period_start: periodStart.toISOString().slice(0, 10),
        p_period_end: periodEnd.toISOString().slice(0, 10),
        p_report_type: "daily",
      },
    );

    if (opError) throw opError;

    const { data: esgReport, error: esgError } = await supabase.rpc(
      "generate_sustainability_report",
      {
        p_period_start: periodStart.toISOString().slice(0, 10),
        p_period_end: periodEnd.toISOString().slice(0, 10),
      },
    );

    if (esgError) throw esgError;

    const { data: refreshed, error: engError } = await supabase.rpc(
      "refresh_user_engagement",
    );

    if (engError) throw engError;

    return new Response(
      JSON.stringify({
        operational_report: opReport,
        sustainability_report: esgReport,
        users_refreshed: refreshed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
