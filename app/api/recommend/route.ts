import { AppError, toErrorResponse } from "@/lib/errors";
import { runRecommendation } from "@/lib/pipeline";
import { RecommendRequestSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => {
      throw new AppError("INVALID_INPUT", 400, "Request body must be valid JSON.");
    });
    const input = RecommendRequestSchema.parse(body);
    const { id, recommendation } = await runRecommendation(input);
    return Response.json({ id, recommendation });
  } catch (err) {
    return toErrorResponse(err);
  }
}
