import { NextResponse } from "next/server";
import { requireStaffTabletQueryContext } from "@/lib/staff-tablet/request-context";
import { BootstrapUnavailableError, loadStaffTabletSnapshot } from "@/lib/staff-tablet/snapshot-loader";

// A snapshot includes rider data and access policy; never cache it across actors.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const result = await requireStaffTabletQueryContext(request);
    if ("error" in result) {
      // The guard/adapter may retain its response; do not mutate or consume it.
      const response = result.error.clone();
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    // since is an optional opaque hint. A full bootstrap must not filter out
    // unchanged rows or misrepresent a timestamp as a durable server cursor.
    const snapshot = await loadStaffTabletSnapshot(result.context, result.deviceIdentifier);
    return NextResponse.json(snapshot, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof BootstrapUnavailableError) {
      return NextResponse.json({ code: error.code, message: error.message }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ message: "Unable to load staff tablet bootstrap." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
