import { z } from "zod";

// ---- Parser output (before we know the location's timezone) ----
export const DayTokenSchema = z.enum(["today", "tomorrow", "weekend", "week"]);
export const PeriodSchema = z.enum(["morning", "afternoon", "evening", "night", "any"]);
export const ActivityKeySchema = z.enum([
  "running", "cycling", "hiking", "walking", "picnic", "swimming", "generic",
]);
export type ActivityKey = z.infer<typeof ActivityKeySchema>;

export const ParsedIntentSchema = z.object({
  activity: ActivityKeySchema,              // key into ACTIVITY_DEFAULTS
  activityLabel: z.string().min(1),         // what the UI shows, e.g. "Running"
  dayToken: DayTokenSchema,
  period: PeriodSchema,
  temp: z.object({ idealMin: z.number(), idealMax: z.number() }), // °C
  maxPrecipProb: z.number().min(0).max(100),                       // %
  maxWind: z.number().min(0),                                       // km/h
  requireDaylight: z.boolean(),
  minDurationHours: z.number().int().min(1).max(6),
});
export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

// ---- Resolved intent (after geocoding gives us the timezone) ----
export const IntentSchema = ParsedIntentSchema.extend({
  dayRange: z.object({ from: z.string(), to: z.string() }),  // "YYYY-MM-DD", inclusive, in location tz
  hourRange: z.object({
    start: z.number().int().min(0).max(23),
    end: z.number().int().min(0).max(23),                    // inclusive
  }),
});
export type Intent = z.infer<typeof IntentSchema>;

// ---- External data ----
export type GeoLocation = {
  name: string;
  country: string;
  admin1?: string;          // region / state, for disambiguation in the UI
  latitude: number;
  longitude: number;
  timezone: string;         // IANA, e.g. "Europe/Skopje"
};

export type HourlyForecastPoint = {
  time: string;                    // "2026-08-28T17:00" — LOCAL to the location, as Open-Meteo returns it
  temperature: number;             // °C
  apparentTemperature: number;     // °C
  precipitationProbability: number;// 0–100
  precipitation: number;           // mm
  windSpeed: number;               // km/h
  cloudCover: number;              // 0–100
  isDay: boolean;
};

// ---- Scoring output ----
export type ScoreBreakdown = { temperature: number; precipitation: number; wind: number; cloud: number }; // each 0–100
export type ScoredHour = HourlyForecastPoint & { score: number; breakdown: ScoreBreakdown };

export type BestWindow = {
  start: string;            // local ISO of first hour
  end: string;              // local ISO of last hour in the window (inclusive)
  meanScore: number;        // 0–100, rounded to 1 decimal
  hours: ScoredHour[];
  summary: { avgTemp: number; maxPrecipProb: number; avgWind: number; allDaylight: boolean };
};

export type NoWindowReason = "NO_HOURS_IN_RANGE" | "NO_ACCEPTABLE_WINDOW";

export type Recommendation = {
  location: GeoLocation;
  intent: Intent;
  parserUsed: "keyword" | "llm";
  candidates: ScoredHour[];       // filtered + scored hours (this is what the chart renders)
  bestWindow: BestWindow | null;
  noWindowReason?: NoWindowReason;
};

// ---- API boundary ----
export const RecommendRequestSchema = z.object({
  location: z.string().trim().min(2).max(80),
  request: z.string().trim().min(5).max(300),
});
export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

export type SearchSummary = {
  id: string;
  createdAt: string;        // ISO
  locationInput: string;
  resolvedName: string;
  requestText: string;
  activityLabel: string;
  bestWindowStart: string | null;
  bestWindowEnd: string | null;
  meanScore: number | null;
};

export type ApiErrorCode = "INVALID_INPUT" | "LOCATION_NOT_FOUND" | "WEATHER_UNAVAILABLE" | "INTERNAL";
export type ApiError = { error: { code: ApiErrorCode; message: string; details?: unknown } };
