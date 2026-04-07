import { toErrorResponse } from "@/server/api-errors";
import { requireSupabaseUser } from "@/server/auth";
import { getBikeDto } from "@/server/dal";

export async function GET(request: Request, { params }: { readonly params: Promise<{ id: string }> }) {
  try {
    await requireSupabaseUser(request);

    const { id } = await params;
    const bike = await getBikeDto(id);

    if (!bike) {
      return Response.json({ error: "Bike not found." }, { status: 404 });
    }

    return Response.json(bike);
  } catch (error) {
    return toErrorResponse(error);
  }
}
