import { PrismaClient } from "@prisma/client";
import type { Recommendation, RecommendRequest, SearchSummary } from "@/lib/types";

// Standard Next.js dev pattern: keep one client across hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function saveSearch(input: RecommendRequest, rec: Recommendation): Promise<string> {
  const row = await prisma.search.create({
    data: {
      locationInput: input.location,
      resolvedName: [rec.location.name, rec.location.country].filter(Boolean).join(", "),
      latitude: rec.location.latitude,
      longitude: rec.location.longitude,
      timezone: rec.location.timezone,
      requestText: input.request,
      activityLabel: rec.intent.activityLabel,
      parserUsed: rec.parserUsed,
      intentJson: JSON.stringify(rec.intent),
      resultJson: JSON.stringify(rec),
      bestWindowStart: rec.bestWindow?.start ?? null,
      bestWindowEnd: rec.bestWindow?.end ?? null,
      meanScore: rec.bestWindow?.meanScore ?? null,
    },
  });
  return row.id;
}

export async function listRecentSearches(limit = 10): Promise<SearchSummary[]> {
  const rows = await prisma.search.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    locationInput: r.locationInput,
    resolvedName: r.resolvedName,
    requestText: r.requestText,
    activityLabel: r.activityLabel,
    bestWindowStart: r.bestWindowStart,
    bestWindowEnd: r.bestWindowEnd,
    meanScore: r.meanScore,
  }));
}
