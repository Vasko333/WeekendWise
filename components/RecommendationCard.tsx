import { StatusMessage } from "@/components/StatusMessage";
import { Card, Tag } from "@/components/ui";
import { WEIGHTS } from "@/lib/score";
import type { Recommendation, ScoreBreakdown } from "@/lib/types";

const NO_WINDOW_TEXT = {
  NO_HOURS_IN_RANGE:
    "Nothing in the next 7 days matches that time of day and daylight requirement. Try a different time of day.",
  NO_ACCEPTABLE_WINDOW: (hours: number) =>
    `Every ${hours}-hour block in that range has at least one poor hour. Try allowing more rain or a shorter duration.`,
};

// The time strings are already local to the location, so treating them as UTC
// and formatting in UTC reproduces the same wall-clock time.
function formatDay(localIso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(localIso + ":00Z"));
}

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const { location, intent, parserUsed, bestWindow, noWindowReason } = recommendation;

  if (!bestWindow) {
    const message =
      noWindowReason === "NO_ACCEPTABLE_WINDOW"
        ? NO_WINDOW_TEXT.NO_ACCEPTABLE_WINDOW(intent.minDurationHours)
        : NO_WINDOW_TEXT.NO_HOURS_IN_RANGE;
    return (
      <Card>
        <StatusMessage kind="empty" title="No suitable window found" message={message} />
      </Card>
    );
  }

  const { summary } = bestWindow;
  const avg = (key: keyof ScoreBreakdown) =>
    Math.round(bestWindow.hours.reduce((sum, h) => sum + h.breakdown[key], 0) / bestWindow.hours.length);
  const resolvedName = [location.name, location.admin1, location.country].filter(Boolean).join(", ");
  const tiles = [
    { label: "Avg temp", value: `${summary.avgTemp} °C` },
    { label: "Max rain chance", value: `${summary.maxPrecipProb} %` },
    { label: "Avg wind", value: `${summary.avgWind} km/h` },
    { label: "Daylight", value: summary.allDaylight ? "yes" : "no" },
  ];

  return (
    <Card>
      <div className="flex flex-wrap gap-6">
        <Tag>{intent.activityLabel}</Tag>
        <Tag>{intent.period}</Tag>
        <Tag>{`ideal ${intent.temp.idealMin}–${intent.temp.idealMax} °C`}</Tag>
        <Tag>{`parsed by: ${parserUsed}`}</Tag>
      </div>
      <p className="mt-22 text-body text-steel-gray">
        {resolvedName} · {location.timezone}
      </p>
      <div className="mt-22 flex flex-wrap items-baseline justify-between gap-22">
        <p className="text-heading text-off-black">
          {formatDay(bestWindow.start)}, {bestWindow.start.slice(11, 16)}–{bestWindow.end.slice(11, 16)}
        </p>
        <div>
          <p className="text-heading text-off-black">{Math.round(bestWindow.meanScore)}</p>
          <p className="text-[12px] text-ash-gray">mean suitability / 100</p>
        </div>
      </div>
      <div className="mt-22 grid grid-cols-2 gap-6 md:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-3xl bg-off-white p-22">
            <p className="text-subheading text-off-black">{tile.value}</p>
            <p className="mt-4 text-[12px] text-steel-gray">{tile.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-22 text-[12px] text-steel-gray">
        temperature {avg("temperature")} · rain {avg("precipitation")} · wind {avg("wind")} · cloud {avg("cloud")}{" "}
        (weighted {WEIGHTS.temperature * 100}/{WEIGHTS.precipitation * 100}/{WEIGHTS.wind * 100}/{WEIGHTS.cloud * 100})
      </p>
    </Card>
  );
}
