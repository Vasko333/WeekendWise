import { useState, useSyncExternalStore } from "react";
import { Pill } from "@/components/ui";

const emptySubscribe = () => () => {};

const EXAMPLES = [
  { location: "Skopje", request: "running tomorrow evening, cool, unlikely to rain" },
  { location: "Ohrid", request: "picnic this weekend, warm and sunny" },
  { location: "Berlin", request: "cycling tomorrow morning for 2 hours, not windy" },
];

type Props = {
  location: string;
  request: string;
  loading: boolean;
  onLocationChange: (value: string) => void;
  onRequestChange: (value: string) => void;
  onSubmit: () => void;
};

export function SearchForm({ location, request, loading, onLocationChange, onRequestChange, onSubmit }: Props) {
  const [attempted, setAttempted] = useState(false);
  // Until React hydrates, a click on submit would trigger the browser's native
  // form submission (a page reload that looks like "nothing happened"), so the
  // button stays disabled until then. useSyncExternalStore is React's sanctioned
  // way to render a value that legitimately differs between server and client.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const missingLocation = location.trim() === "";
  const missingRequest = request.trim() === "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    if (missingLocation || missingRequest) return;
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-22">
      <div>
        <label htmlFor="location" className="text-[12px] text-steel-gray">Location</label>
        <input
          id="location"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="Skopje"
          className="mt-6 w-full rounded-3xl border-[0.5px] border-black/6 bg-pure-white px-22 py-3.5 text-body text-off-black transition-colors duration-150 placeholder:text-ash-gray"
        />
        {attempted && missingLocation && (
          <p className="mt-4 text-[12px] text-steel-gray">Please enter a location.</p>
        )}
      </div>
      <div>
        <label htmlFor="request" className="text-[12px] text-steel-gray">What do you want to do?</label>
        <input
          id="request"
          value={request}
          onChange={(e) => onRequestChange(e.target.value)}
          placeholder="running tomorrow evening, cool, unlikely to rain"
          className="mt-6 w-full rounded-3xl border-[0.5px] border-black/6 bg-pure-white px-22 py-3.5 text-body text-off-black transition-colors duration-150 placeholder:text-ash-gray"
        />
        {attempted && missingRequest && (
          <p className="mt-4 text-[12px] text-steel-gray">Please describe what you want to do.</p>
        )}
      </div>
      <Pill disabled={loading || !hydrated}>{loading ? "Scoring hours…" : "Find the best window"}</Pill>
      <div className="flex flex-wrap gap-6">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.location}
            type="button"
            onClick={() => {
              onLocationChange(ex.location);
              onRequestChange(ex.request);
            }}
            className="rounded-full-3 border-[0.5px] border-signal-blue px-10 py-0.5 text-left text-[12px] text-signal-blue transition-opacity duration-150 hover:opacity-75"
          >
            {ex.location} · {ex.request}
          </button>
        ))}
      </div>
    </form>
  );
}
