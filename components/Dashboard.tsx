"use client";

import { useState } from "react";
import { HourlyScores } from "@/components/HourlyScores";
import { RecentSearches } from "@/components/RecentSearches";
import { RecommendationCard } from "@/components/RecommendationCard";
import { SearchForm } from "@/components/SearchForm";
import { StatusMessage } from "@/components/StatusMessage";
import { Card, SectionLabel, Tag } from "@/components/ui";
import type { ApiError, Recommendation, SearchSummary } from "@/lib/types";

type Status = "idle" | "loading" | "success" | "error";

function errorMessageFor(error: ApiError["error"] | undefined, location: string): string {
  if (error?.code === "INVALID_INPUT") return error.message;
  if (error?.code === "LOCATION_NOT_FOUND")
    return `We couldn't find "${location}". Try adding a country, e.g. "Springfield, US".`;
  if (error?.code === "WEATHER_UNAVAILABLE")
    return "The weather service didn't respond. Please try again in a moment.";
  return "Something unexpected happened. Please try again.";
}

function SkeletonCard() {
  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div className="h-7 w-1/3 rounded-3xl bg-black/4" />
        <div className="h-12 w-2/3 rounded-3xl bg-black/4" />
        <div className="h-24 w-full rounded-3xl bg-black/4" />
      </div>
    </Card>
  );
}

export default function Dashboard({ initialHistory }: { initialHistory: SearchSummary[] }) {
  const [location, setLocation] = useState("");
  const [request, setRequest] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Recommendation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [history, setHistory] = useState<SearchSummary[]>(initialHistory);

  async function submit() {
    setStatus("loading");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ location: location.trim(), request: request.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(errorMessageFor(data.error, location.trim()));
        setStatus("error");
        return;
      }
      setResult(data.recommendation);
      setStatus("success");
      refreshHistory();
    } catch {
      setErrorMessage("Something unexpected happened. Please try again.");
      setStatus("error");
    }
  }

  async function openSearch(id: string) {
    setStatus("loading");
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setLocation(data.locationInput);
      setRequest(data.requestText);
      setResult(data.recommendation);
      setStatus("success");
    } catch {
      setErrorMessage("Couldn't load that search. Please try again.");
      setStatus("error");
    }
  }

  async function refreshHistory() {
    try {
      const res = await fetch("/api/history");
      if (res.ok) setHistory((await res.json()).searches);
    } catch {
      // keep the current list; history is not critical
    }
  }

  return (
    <div className="mx-auto max-w-300 px-22">
      <nav className="mx-auto mt-34 flex w-full items-center justify-center gap-10 rounded-lg border-[0.5px] border-black/6 bg-pure-white px-30 py-11 md:w-fit">
        <p className="text-body text-off-black">✦ WeekendWise</p>
        <Tag>Open-Meteo</Tag>
      </nav>
      <main className="flex flex-col gap-50 pt-50 md:gap-94 md:pt-94">
        <section>
          <SectionLabel label="Plan" title="What do you want to do?" />
          <div className="mt-22">
            <Card padding="main">
              <SearchForm
                location={location}
                request={request}
                loading={status === "loading"}
                onLocationChange={setLocation}
                onRequestChange={setRequest}
                onSubmit={submit}
              />
              {status === "error" && (
                <div className="mt-22">
                  <StatusMessage kind="error" title="Something went wrong" message={errorMessage} />
                </div>
              )}
            </Card>
          </div>
        </section>
        {(status === "loading" || (status === "success" && result)) && (
          <section aria-live="polite" aria-busy={status === "loading"}>
            <SectionLabel label="Recommendation" title="Best window" />
            <div className="mt-22">
              {status === "loading" ? <SkeletonCard /> : <RecommendationCard recommendation={result!} />}
            </div>
          </section>
        )}
        {status === "success" && result && result.candidates.length > 0 && (
          <section>
            <SectionLabel label="Forecast" title="Hourly suitability" />
            <div className="mt-22">
              <HourlyScores candidates={result.candidates} bestWindow={result.bestWindow} />
            </div>
          </section>
        )}
        <section>
          <SectionLabel label="History" title="Recent searches" />
          <div className="mt-22">
            <RecentSearches searches={history} onSelect={openSearch} />
          </div>
        </section>
      </main>
    </div>
  );
}
