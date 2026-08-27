// How scoring works, in plain English:
// 1. Keep only hours inside the requested days, time-of-day, and daylight.
// 2. Score each hour 0-100 per metric: temperature vs the ideal band, rain
//    and wind vs the user's tolerance, clouds mildly. Weighted sum = score.
// 3. Slide a window of the requested length over contiguous hours; every hour
//    must clear MIN_ACCEPTABLE_HOUR_SCORE. Highest mean wins; ties -> earliest.
import type {
  BestWindow,
  GeoLocation,
  HourlyForecastPoint,
  Intent,
  Recommendation,
  ScoredHour,
} from "@/lib/types";

export const WEIGHTS = { temperature: 0.40, precipitation: 0.35, wind: 0.15, cloud: 0.10 } as const; // must sum to 1
export const TEMP_FALLOFF_PER_DEGREE = 10;   // score lost per °C outside the ideal band
export const CLOUD_PENALTY_AT_OVERCAST = 50; // full overcast scores 50, not 0 — clouds rarely stop an activity
export const MIN_ACCEPTABLE_HOUR_SCORE = 35; // an hour below this can never be part of a recommended window

export function scoreTemperature(temp: number, ideal: { idealMin: number; idealMax: number }): number {
  const distance = temp < ideal.idealMin ? ideal.idealMin - temp : temp > ideal.idealMax ? temp - ideal.idealMax : 0;
  return clamp(100 - distance * TEMP_FALLOFF_PER_DEGREE);
}

export function scorePrecipitation(prob: number, maxProb: number): number {
  if (maxProb === 0) return prob > 0 ? 0 : 100;
  if (prob >= maxProb) return 0;
  return clamp(100 * (1 - prob / maxProb));
}

export function scoreWind(speed: number, maxWind: number): number {
  if (maxWind === 0) return speed > 0 ? 0 : 100;
  if (speed >= maxWind) return 0;
  return clamp(100 * (1 - speed / maxWind));
}

export function scoreCloud(cloudCover: number): number {
  return clamp(100 - (cloudCover / 100) * CLOUD_PENALTY_AT_OVERCAST);
}

export function scoreHour(h: HourlyForecastPoint, intent: Intent): ScoredHour {
  const breakdown = {
    temperature: scoreTemperature(h.temperature, intent.temp),
    precipitation: scorePrecipitation(h.precipitationProbability, intent.maxPrecipProb),
    wind: scoreWind(h.windSpeed, intent.maxWind),
    cloud: scoreCloud(h.cloudCover),
  };
  const score = round1(
    breakdown.temperature * WEIGHTS.temperature +
    breakdown.precipitation * WEIGHTS.precipitation +
    breakdown.wind * WEIGHTS.wind +
    breakdown.cloud * WEIGHTS.cloud,
  );
  return { ...h, score, breakdown };
}

export function isCandidate(h: HourlyForecastPoint, intent: Intent): boolean {
  const date = h.time.slice(0, 10);
  const hour = parseInt(h.time.slice(11, 13), 10);
  return (
    date >= intent.dayRange.from &&
    date <= intent.dayRange.to &&
    hour >= intent.hourRange.start &&
    hour <= intent.hourRange.end &&
    (!intent.requireDaylight || h.isDay)
  );
}

export function filterCandidates(hours: HourlyForecastPoint[], intent: Intent): HourlyForecastPoint[] {
  return hours.filter((h) => isCandidate(h, intent));
}

export function findBestWindow(scored: ScoredHour[], minDurationHours: number): BestWindow | null {
  let best: ScoredHour[] | null = null;
  let bestMean = -1;
  for (const run of splitIntoContiguousRuns(scored)) {
    for (let i = 0; i + minDurationHours <= run.length; i++) {
      const window = run.slice(i, i + minDurationHours);
      if (window.some((h) => h.score < MIN_ACCEPTABLE_HOUR_SCORE)) continue;
      const mean = window.reduce((sum, h) => sum + h.score, 0) / window.length;
      if (mean > bestMean) {
        best = window;
        bestMean = mean;
      }
    }
  }
  return best ? buildWindow(best, bestMean) : null;
}

export function recommend(
  intent: Intent,
  hours: HourlyForecastPoint[],
  location: GeoLocation,
  parserUsed: "keyword" | "llm",
): Recommendation {
  const candidates = filterCandidates(hours, intent).map((h) => scoreHour(h, intent));
  if (candidates.length === 0) {
    return { location, intent, parserUsed, candidates, bestWindow: null, noWindowReason: "NO_HOURS_IN_RANGE" };
  }
  const bestWindow = findBestWindow(candidates, intent.minDurationHours);
  if (bestWindow === null) {
    return { location, intent, parserUsed, candidates, bestWindow, noWindowReason: "NO_ACCEPTABLE_WINDOW" };
  }
  return { location, intent, parserUsed, candidates, bestWindow };
}

const HOUR_IN_MS = 3_600_000;

// Both times are local strings; parsing them uniformly as UTC is safe because
// we only ever take the difference, never convert them.
function splitIntoContiguousRuns(scored: ScoredHour[]): ScoredHour[][] {
  const runs: ScoredHour[][] = [];
  for (const hour of scored) {
    const run = runs[runs.length - 1];
    const prev = run?.[run.length - 1];
    if (prev && Date.parse(hour.time + "Z") - Date.parse(prev.time + "Z") === HOUR_IN_MS) {
      run.push(hour);
    } else {
      runs.push([hour]);
    }
  }
  return runs;
}

function buildWindow(hours: ScoredHour[], meanScore: number): BestWindow {
  return {
    start: hours[0].time,
    end: hours[hours.length - 1].time,
    meanScore: round1(meanScore),
    hours,
    summary: {
      avgTemp: Math.round(hours.reduce((s, h) => s + h.temperature, 0) / hours.length),
      maxPrecipProb: Math.max(...hours.map((h) => h.precipitationProbability)),
      avgWind: Math.round(hours.reduce((s, h) => s + h.windSpeed, 0) / hours.length),
      allDaylight: hours.every((h) => h.isDay),
    },
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
