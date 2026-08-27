import { saveSearch } from "@/lib/db";
import { parseIntentWithFallback, resolveIntent } from "@/lib/intent";
import { fetchHourlyForecast, geocode } from "@/lib/openMeteo";
import { recommend } from "@/lib/score";
import type { Recommendation, RecommendRequest } from "@/lib/types";

// The whole flow, top to bottom: parse -> geocode -> resolve -> forecast -> score -> save.
export async function runRecommendation(
  input: RecommendRequest,
): Promise<{ id: string; recommendation: Recommendation }> {
  const { parsed, parserUsed } = await parseIntentWithFallback(input.request);
  const location = await geocode(input.location);
  const intent = resolveIntent(parsed, location.timezone);
  const hours = await fetchHourlyForecast(location);
  const recommendation = recommend(intent, hours, location, parserUsed);
  const id = await saveSearch(input, recommendation);
  return { id, recommendation };
}
