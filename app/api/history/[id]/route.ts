import { getSearch } from "@/lib/db";
import { AppError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const search = await getSearch(id);
    if (!search) {
      throw new AppError("INVALID_INPUT", 404, "That search no longer exists.");
    }
    return Response.json(search);
  } catch (err) {
    return toErrorResponse(err);
  }
}
