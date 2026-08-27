import { describe, expect, it } from "vitest";
import {
  filterCandidates,
  findBestWindow,
  MIN_ACCEPTABLE_HOUR_SCORE,
  recommend,
  scoreHour,
  scorePrecipitation,
  scoreTemperature,
  scoreWind,
} from "@/lib/score";
import type { GeoLocation, ScoredHour } from "@/lib/types";
import { makeDay, makeHour, makeIntent } from "./fixtures";

function scored(time: string, score: number): ScoredHour {
  return {
    ...makeHour({ time }),
    score,
    breakdown: { temperature: score, precipitation: score, wind: score, cloud: score },
  };
}

const location: GeoLocation = {
  name: "Testville",
  country: "Testland",
  latitude: 0,
  longitude: 0,
  timezone: "UTC",
};

describe("per-metric scores", () => {
  it("scoreTemperature: 100 inside the band, 50 at 5°C above idealMax, 0 at 10°C or more outside", () => {
    const band = { idealMin: 8, idealMax: 18 };
    expect(scoreTemperature(8, band)).toBe(100);
    expect(scoreTemperature(15, band)).toBe(100);
    expect(scoreTemperature(18, band)).toBe(100);
    expect(scoreTemperature(23, band)).toBe(50);
    expect(scoreTemperature(28, band)).toBe(0);
    expect(scoreTemperature(-2, band)).toBe(0);
  });

  it("scorePrecipitation: 100 at 0%, 50 at half of maxProb, 0 at maxProb, 0 above", () => {
    expect(scorePrecipitation(0, 40)).toBe(100);
    expect(scorePrecipitation(20, 40)).toBe(50);
    expect(scorePrecipitation(40, 40)).toBe(0);
    expect(scorePrecipitation(60, 40)).toBe(0);
  });

  it("scoreWind mirrors the precipitation shape", () => {
    expect(scoreWind(0, 30)).toBe(100);
    expect(scoreWind(15, 30)).toBe(50);
    expect(scoreWind(30, 30)).toBe(0);
    expect(scoreWind(45, 30)).toBe(0);
  });
});

describe("hour-level scoring and filtering", () => {
  it("scoreHour weights sum correctly: all metrics 100 -> 100; temperature 0 with others 100 -> 60", () => {
    const intent = makeIntent();
    const perfect = scoreHour(
      makeHour({ temperature: 15, precipitationProbability: 0, windSpeed: 0, cloudCover: 0 }),
      intent,
    );
    expect(perfect.score).toBe(100);
    const hotOnly = scoreHour(
      makeHour({ temperature: 28, precipitationProbability: 0, windSpeed: 0, cloudCover: 0 }),
      intent,
    );
    expect(hotOnly.breakdown.temperature).toBe(0);
    expect(hotOnly.score).toBe(60);
  });

  it("filterCandidates excludes hours outside hourRange, outside dayRange, and night hours when daylight is required", () => {
    const intent = makeIntent({ requireDaylight: true });
    const inRange = makeHour({ time: "2026-08-28T18:00" });
    const wrongHour = makeHour({ time: "2026-08-28T16:00" });
    const wrongDay = makeHour({ time: "2026-08-27T18:00" });
    const night = makeHour({ time: "2026-08-28T19:00", isDay: false });
    expect(filterCandidates([inRange, wrongHour, wrongDay, night], intent)).toEqual([inRange]);
  });
});

describe("findBestWindow", () => {
  it("picks the contiguous 2-hour window with the highest mean, not the single best hour", () => {
    const hours = [
      scored("2026-08-28T17:00", 90),
      scored("2026-08-28T18:00", 50),
      scored("2026-08-28T19:00", 70),
      scored("2026-08-28T20:00", 75),
    ];
    const window = findBestWindow(hours, 2);
    expect(window?.start).toBe("2026-08-28T19:00");
    expect(window?.end).toBe("2026-08-28T20:00");
    expect(window?.meanScore).toBe(72.5);
  });

  it("breaks ties by earliest start", () => {
    const hours = [
      scored("2026-08-28T17:00", 80),
      scored("2026-08-28T18:00", 70),
      scored("2026-08-28T19:00", 70),
      scored("2026-08-28T20:00", 80),
    ];
    expect(findBestWindow(hours, 2)?.start).toBe("2026-08-28T17:00");
  });

  it("returns null when no contiguous run is at least minDurationHours long", () => {
    const hours = [
      scored("2026-08-28T17:00", 90),
      scored("2026-08-28T19:00", 90),
      scored("2026-08-28T21:00", 90),
    ];
    expect(findBestWindow(hours, 2)).toBeNull();
  });

  it("rejects any window containing an hour below MIN_ACCEPTABLE_HOUR_SCORE, even if the mean would be high", () => {
    const hours = [
      scored("2026-08-28T17:00", 100),
      scored("2026-08-28T18:00", MIN_ACCEPTABLE_HOUR_SCORE - 5),
      scored("2026-08-28T19:00", 60),
      scored("2026-08-28T20:00", 60),
    ];
    const window = findBestWindow(hours, 2);
    expect(window?.start).toBe("2026-08-28T19:00");
    expect(window?.meanScore).toBe(60);
  });
});

describe("recommend", () => {
  it("finds tomorrow evening's clearly best hour on a 2-day fixture", () => {
    const calmDay = makeDay("2026-08-27", () => ({}));
    const targetDay = makeDay("2026-08-28", (hour) => {
      if (hour === 17) return { temperature: 26 };
      if (hour === 18) return { precipitationProbability: 0, windSpeed: 5, cloudCover: 10 };
      if (hour === 19) return { precipitationProbability: 20 };
      if (hour === 20) return { precipitationProbability: 30 };
      if (hour === 21) return { precipitationProbability: 80, precipitation: 2 };
      return {};
    });
    const rec = recommend(makeIntent(), [...calmDay, ...targetDay], location, "keyword");
    expect(rec.bestWindow?.start).toBe("2026-08-28T18:00");
    expect(rec.noWindowReason).toBeUndefined();
  });

  it("returns NO_HOURS_IN_RANGE when daylight is required and all candidate hours are night", () => {
    const darkDay = makeDay("2026-08-28", () => ({ isDay: false }));
    const rec = recommend(makeIntent({ requireDaylight: true }), darkDay, location, "keyword");
    expect(rec.bestWindow).toBeNull();
    expect(rec.candidates).toEqual([]);
    expect(rec.noWindowReason).toBe("NO_HOURS_IN_RANGE");
  });
});
