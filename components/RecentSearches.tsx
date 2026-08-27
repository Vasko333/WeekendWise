import { StatusMessage } from "@/components/StatusMessage";
import type { SearchSummary } from "@/lib/types";

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
  if (mins < 48 * 60) return "yesterday";
  return `${Math.floor(mins / 1440)} days ago`;
}

export function RecentSearches({
  searches,
  onSelect,
}: {
  searches: SearchSummary[];
  onSelect: (id: string) => void;
}) {
  if (searches.length === 0) {
    return <StatusMessage kind="empty" message="No searches yet. Try one of the examples above." />;
  }
  return (
    <ul className="flex flex-col gap-6">
      {searches.map((s) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => onSelect(s.id)}
            title="view this result"
            className="flex w-full cursor-pointer items-center justify-between gap-22 rounded-3xl border-[0.5px] border-black/6 bg-pure-white p-22 text-left transition-colors duration-150 hover:border-black/15"
          >
            <div className="min-w-0">
              <p className="truncate text-body text-off-black">{s.requestText}</p>
              {/* The relative time differs between server render and hydration by design. */}
              <p suppressHydrationWarning className="mt-4 text-[12px] text-steel-gray">
                {s.resolvedName} · {s.activityLabel} · {relativeTime(s.createdAt)}
              </p>
            </div>
            {s.meanScore !== null ? (
              <p className="shrink-0 text-subheading text-off-black">{Math.round(s.meanScore)}</p>
            ) : (
              <p title="no suitable window" className="shrink-0 text-subheading text-ash-gray">—</p>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
