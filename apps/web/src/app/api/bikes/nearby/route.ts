import { toErrorResponse } from "@/server/api-errors";
import { requireSupabaseUser } from "@/server/auth";
import { getNearbyBikesDto } from "@/server/dal";
import { parseNearbyBikesQuery } from "@/server/nearby-query";

export async function GET(request: Request) {
  try {
    await requireSupabaseUser(request);

    const query = parseNearbyBikesQuery(request.url);
    const result = await getNearbyBikesDto(query);

    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
