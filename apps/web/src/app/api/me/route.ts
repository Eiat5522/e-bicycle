import { requireSupabaseUser } from "@/server/auth";
import { getCurrentUserDto } from "@/server/dal";
import { toErrorResponse } from "@/server/api-errors";

export async function GET(request: Request) {
  try {
    const user = await requireSupabaseUser(request);
    const userDto = await getCurrentUserDto(user);

    return Response.json(userDto);
  } catch (error) {
    return toErrorResponse(error);
  }
}
