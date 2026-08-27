import { z } from "zod";
import {
  ActivityKey,
  DayTokenSchema,
  Intent,
  IntentSchema,
  ParsedIntent,
  ParsedIntentSchema,
  PeriodSchema,
} from "@/lib/types";

type DayToken = z.infer<typeof DayTokenSchema>;
type Period = z.infer<typeof PeriodSchema>;

export const ACTIVITY_DEFAULTS: Record<ActivityKey, {
  label: string; minDurationHours: number; temp: { idealMin: number; idealMax: number }; requireDaylight: boolean;
}> = {
  running:  { label: "Running",  minDurationHours: 1, temp: { idealMin: 8,  idealMax: 18 }, requireDaylight: false },
  cycling:  { label: "Cycling",  minDurationHours: 2, temp: { idealMin: 12, idealMax: 24 }, requireDaylight: true  },
  hiking:   { label: "Hiking",   minDurationHours: 3, temp: { idealMin: 10, idealMax: 22 }, requireDaylight: true  },
  walking:  { label: "Walking",  minDurationHours: 1, temp: { idealMin: 10, idealMax: 24 }, requireDaylight: false },
  picnic:   { label: "Picnic",   minDurationHours: 2, temp: { idealMin: 18, idealMax: 28 }, requireDaylight: true  },
  swimming: { label: "Swimming", minDurationHours: 2, temp: { idealMin: 24, idealMax: 34 }, requireDaylight: true  },
  generic:  { label: "Outdoor time", minDurationHours: 1, temp: { idealMin: 15, idealMax: 25 }, requireDaylight: false },
};

// Keyword tables: first matching row wins. Keywords match on word boundaries,
// which is why "run" and "running" are both listed ("run" alone would not
// match "running") and why "brunch" does not trigger "run".
const ACTIVITY_KEYWORDS: [string[], ActivityKey][] = [
  [["running", "run", "jog"], "running"],
  [["cycling", "cycle", "bike", "biking"], "cycling"],
  [["hiking", "hike", "trail"], "hiking"],
  [["walking", "walk", "stroll"], "walking"],
  [["picnic", "bbq", "barbecue"], "picnic"],
  [["swimming", "swim", "beach"], "swimming"],
];
const DAY_KEYWORDS: [string[], DayToken][] = [
  [["today", "tonight"], "today"],
  [["tomorrow"], "tomorrow"],
  [["weekend", "saturday", "sunday"], "weekend"],
];
const PERIOD_KEYWORDS: [string[], Period][] = [
  [["morning"], "morning"],
  [["afternoon", "lunch"], "afternoon"],
  [["evening"], "evening"],
  [["night", "tonight", "after dark"], "night"],
];
const TEMP_KEYWORDS: [string[], { idealMin: number; idealMax: number }][] = [
  [["cool", "chilly", "cold", "crisp"], { idealMin: 10, idealMax: 18 }],
  [["not too hot", "not hot"], { idealMin: 12, idealMax: 22 }],
  [["warm", "mild"], { idealMin: 18, idealMax: 26 }],
  [["hot", "sunny"], { idealMin: 25, idealMax: 35 }],
];
const PRECIP_KEYWORDS: [string[], number][] = [
  [["unlikely to rain", "no rain", "not rain", "without rain", "dry"], 20],
  [["don't mind rain", "light rain"], 80],
];
const WIND_KEYWORDS: [string[], number][] = [
  [["calm", "no wind", "not windy", "still"], 15],
  [["windy"], 60],
];
const DAYLIGHT_KEYWORDS: [string[], boolean][] = [
  [["daylight", "sunny", "in the sun"], true],
  [["night", "after dark"], false],
];
const DEFAULT_MAX_PRECIP_PROB = 40;
const DEFAULT_MAX_WIND = 30;

export function parseIntent(text: string): ParsedIntent {
  const t = text.toLowerCase();
  const activity = matchFirst(t, ACTIVITY_KEYWORDS) ?? "generic";
  const defaults = ACTIVITY_DEFAULTS[activity];
  const duration = t.match(/(\d+)\s*(h|hr|hrs|hour|hours)/);
  return ParsedIntentSchema.parse({
    activity,
    activityLabel: defaults.label,
    dayToken: matchFirst(t, DAY_KEYWORDS) ?? "week",
    period: matchFirst(t, PERIOD_KEYWORDS) ?? "any",
    temp: matchFirst(t, TEMP_KEYWORDS) ?? defaults.temp,
    maxPrecipProb: matchFirst(t, PRECIP_KEYWORDS) ?? DEFAULT_MAX_PRECIP_PROB,
    maxWind: matchFirst(t, WIND_KEYWORDS) ?? DEFAULT_MAX_WIND,
    requireDaylight: matchFirst(t, DAYLIGHT_KEYWORDS) ?? defaults.requireDaylight,
    minDurationHours: duration
      ? Math.min(6, Math.max(1, parseInt(duration[1], 10)))
      : defaults.minDurationHours,
  });
}

function matchFirst<T>(text: string, table: [string[], T][]): T | undefined {
  for (const [keywords, value] of table) {
    if (keywords.some((k) => hasWord(text, k))) return value;
  }
  return undefined;
}

function hasWord(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

// Open-Meteo returns time strings local to the location ("2026-08-28T17:00"),
// so once dayRange/hourRange are computed in the location's timezone, all
// later filtering is plain string comparison — no timezone library needed.
const HOUR_RANGES: Record<Period, { start: number; end: number }> = {
  morning: { start: 6, end: 11 },
  afternoon: { start: 12, end: 16 },
  evening: { start: 17, end: 21 },
  night: { start: 20, end: 23 },
  any: { start: 6, end: 22 },
};
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function resolveIntent(parsed: ParsedIntent, timezone: string, now: Date = new Date()): Intent {
  const today = localDateInTimezone(now, timezone);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(now);
  return IntentSchema.parse({
    ...parsed,
    dayRange: dayRangeFor(parsed.dayToken, today, weekday),
    hourRange: HOUR_RANGES[parsed.period],
  });
}

function dayRangeFor(dayToken: DayToken, today: string, weekday: string): { from: string; to: string } {
  if (dayToken === "today") return { from: today, to: today };
  if (dayToken === "tomorrow") {
    const tomorrow = addDays(today, 1);
    return { from: tomorrow, to: tomorrow };
  }
  if (dayToken === "weekend") {
    if (weekday === "Sat") return { from: today, to: addDays(today, 1) };
    if (weekday === "Sun") return { from: today, to: today };
    const saturday = addDays(today, 6 - WEEKDAYS.indexOf(weekday));
    return { from: saturday, to: addDays(saturday, 1) };
  }
  return { from: today, to: addDays(today, 6) };
}

export function localDateInTimezone(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + n)).toISOString().slice(0, 10);
}
