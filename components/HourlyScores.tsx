import { Card } from "@/components/ui";
import type { BestWindow, ScoredHour } from "@/lib/types";

const BAR_AREA_HEIGHT = 120;

function groupByDate(candidates: ScoredHour[]): [string, ScoredHour[]][] {
  const days = new Map<string, ScoredHour[]>();
  for (const h of candidates) {
    const date = h.time.slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), h]);
  }
  return [...days.entries()];
}

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric" }).format(
    new Date(date + "T00:00:00Z"),
  );
}

function barTitle(h: ScoredHour): string {
  return `${h.time.slice(11, 16)} · ${Math.round(h.score)} · ${Math.round(h.temperature)} °C · rain ${h.precipitationProbability} % · wind ${Math.round(h.windSpeed)} km/h`;
}

export function HourlyScores({ candidates, bestWindow }: { candidates: ScoredHour[]; bestWindow: BestWindow | null }) {
  const inWindow = (h: ScoredHour) =>
    bestWindow !== null && h.time >= bestWindow.start && h.time <= bestWindow.end;

  return (
    <Card>
      <div className="flex flex-col gap-22">
        {groupByDate(candidates).map(([date, hours]) => {
          const labelStep = hours.length > 12 ? 6 : 3;
          return (
            <div key={date} className="flex items-end gap-22">
              <p className="w-50 shrink-0 pb-22 text-[12px] text-steel-gray">{dayLabel(date)}</p>
              <div className="flex flex-1 items-end gap-6">
                {hours.map((h, i) => (
                  <div key={h.time} className="group relative flex min-w-[6px] flex-1 flex-col items-stretch gap-4">
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-4 hidden -translate-x-1/2 whitespace-nowrap rounded-full-3 border-[0.5px] border-black/6 bg-pure-white px-10 py-0.5 text-[12px] text-off-black group-hover:block">
                      {barTitle(h)}
                    </span>
                    <div
                      role="img"
                      aria-label={barTitle(h)}
                      title={barTitle(h)}
                      className={`rounded-sm bg-off-black ${inWindow(h) ? "best-window-bar" : ""}`}
                      style={{
                        height: `${Math.max(2, (h.score / 100) * BAR_AREA_HEIGHT)}px`,
                        opacity: 0.15 + 0.85 * (h.score / 100),
                      }}
                    />
                    <p className="h-3 text-center text-caption text-ash-gray">
                      {i % labelStep === 0 ? h.time.slice(11, 16) : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-22 text-[12px] text-steel-gray">
        Hours shown are the ones matching your time-of-day and daylight preferences. Blue outline = recommended
        window.
      </p>
    </Card>
  );
}
