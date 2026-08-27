import { describe, expect, it } from "vitest";
import { parseIntent, resolveIntent } from "@/lib/intent";

describe("parseIntent", () => {
  it("parses the demo sentence", () => {
    const parsed = parseIntent("I want to go running tomorrow evening when it's cool and unlikely to rain");
    expect(parsed).toMatchObject({
      activity: "running",
      dayToken: "tomorrow",
      period: "evening",
      temp: { idealMin: 10, idealMax: 18 },
      maxPrecipProb: 20,
      minDurationHours: 1,
    });
  });

  it("parses 'hiking this weekend, sunny please'", () => {
    const parsed = parseIntent("hiking this weekend, sunny please");
    expect(parsed).toMatchObject({
      activity: "hiking",
      dayToken: "weekend",
      requireDaylight: true,
      minDurationHours: 3,
    });
  });

  it("falls back to generic for an unknown activity and reads the duration", () => {
    const parsed = parseIntent("do something outside for 2 hours");
    expect(parsed).toMatchObject({ activity: "generic", minDurationHours: 2 });
  });
});

describe("resolveIntent", () => {
  it("computes 'tomorrow' in the location's timezone, not the server's", () => {
    // 23:30 UTC on Aug 27 is already 11:30 on Aug 28 in Auckland (UTC+12),
    // so "tomorrow" there must be Aug 29.
    const parsed = parseIntent("running tomorrow");
    const now = new Date("2026-08-27T23:30:00Z");
    const intent = resolveIntent(parsed, "Pacific/Auckland", now);
    expect(intent.dayRange.from).toBe("2026-08-29");
    expect(intent.dayRange.to).toBe("2026-08-29");
  });

  it("resolves 'weekend' from a Wednesday to the coming Saturday–Sunday", () => {
    const parsed = parseIntent("hiking this weekend");
    const now = new Date("2026-08-26T12:00:00Z"); // a Wednesday
    const intent = resolveIntent(parsed, "Europe/Skopje", now);
    expect(intent.dayRange).toEqual({ from: "2026-08-29", to: "2026-08-30" });
  });
});
