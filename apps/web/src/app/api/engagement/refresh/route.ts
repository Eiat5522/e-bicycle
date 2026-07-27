import { NextResponse } from "next/server";

import { parseOptionalJsonObjectBody } from "@/app/api/_utils/json-body";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function GET(request: Request) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_engagement_aggregates")
    .select("*")
    .order("eco_points", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ engagement: data });
}

export async function POST(
  request: Request,
  _context: unknown = {},
) {
  const guard = await requireAdmin(request);
  if ("error" in guard) return guard.error;

  const admin = createAdminClient();

  const parsed = await parseOptionalJsonObjectBody(request);
  if ("error" in parsed) return parsed.error;

  const body = parsed.body as { readonly profileId?: string };

  const rpcArgs = body.profileId !== undefined ? { p_profile_id: body.profileId } : {};

  const { data, error } = await admin.rpc("refresh_user_engagement", rpcArgs);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ usersRefreshed: data }, { status: 201 });
}
