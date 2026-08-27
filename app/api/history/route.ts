import { listRecentSearches } from "@/lib/db";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    const raw = parseInt(new URL(req.url).searchParams.get("limit") ?? "", 10);
    const limit = Number.isNaN(raw) ? 10 : Math.min(50, Math.max(1, raw));
    const searches = await listRecentSearches(limit);
    return Response.json({ searches });
  } catch (err) {
    return toErrorResponse(err);
  }
}
