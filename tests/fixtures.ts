import type { HourlyForecastPoint, Intent } from "@/lib/types";

export function makeHour(overrides: Partial<HourlyForecastPoint> = {}): HourlyForecastPoint {
  return {
    time: "2026-08-28T17:00",
    temperature: 15,
    apparentTemperature: 15,
    precipitationProbability: 10,
    precipitation: 0,
    windSpeed: 10,
    cloudCover: 30,
    isDay: true,
    ...overrides,
  };
}

export function makeIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    activity: "running",
    activityLabel: "Running",
    dayToken: "tomorrow",
    period: "evening",
    temp: { idealMin: 8, idealMax: 18 },
    maxPrecipProb: 40,
    maxWind: 30,
    requireDaylight: false,
    minDurationHours: 1,
    dayRange: { from: "2026-08-28", to: "2026-08-28" },
    hourRange: { start: 17, end: 21 },
    ...overrides,
  };
}

export function makeDay(
  date: string,
  scoreProfile: (hour: number) => Partial<HourlyForecastPoint>,
): HourlyForecastPoint[] {
  return Array.from({ length: 24 }, (_, hour) =>
    makeHour({ time: `${date}T${String(hour).padStart(2, "0")}:00`, ...scoreProfile(hour) }),
  );
}
