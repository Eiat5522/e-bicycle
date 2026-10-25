import { NextResponse } from "next/server";

import { parseRequiredJsonObjectBody } from "@/app/api/_utils/json-body";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

type ReportGenerateBody = {
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly reportType?: string;
};


export async function GET(
  request: Request,
  _context: unknown = {},
) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("operational_reports")
    .select("*")
    .order("period_end", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data });
}

export async function POST(
  request: Request,
  _context: unknown = {},
) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  const admin = createAdminClient();

  const parsed = await parseRequiredJsonObjectBody(request);
  if ("error" in parsed) return parsed.error;

  const body = parsed.body as ReportGenerateBody;

  const periodEnd = body.periodEnd ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const periodStart = body.periodStart ?? periodEnd;
  const reportType = body.reportType ?? "daily";

  const { data, error } = await admin.rpc("generate_operational_report", {
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_report_type: reportType,
  });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ report: data }, { status: 201 });
}
