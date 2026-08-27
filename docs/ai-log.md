# AI Development Log

## [13:15] The build ran from one phased master prompt
**Context:** the entire app was built by Claude Code from a single structured prompt written before any code existed.
**Decision / Problem:** the prompt fixed the architecture up front (Next.js route handlers only, Prisma 6 + SQLite, deterministic scorer as the core, keyword parser primary), defined the exact domain contract for lib/types.ts, and imposed a per-phase lifecycle: code → definition-of-done check → typecheck/tests → commit. Gates ran before tests on purpose — tests prove the code does what was asked, the DoD proves the right thing was asked.
**Outcome:** every commit on main is a working, demoable state; the AI's freedom was spent on implementation detail, not architecture.

## [13:20] Dropped FastAPI in favor of Next.js route handlers
**Context:** initial plan was Next + FastAPI.
**Decision / Problem:** one runtime, one package manager, one deploy story; the backend is two endpoints, which does not justify a second server.
**Outcome:** single-language repo.

## [13:20] Demoted the LLM to an optional parser
**Context:** initial plan had the LLM as the intent engine.
**Decision / Problem:** deterministic keyword parser is primary so the demo works with no key; the LLM parser is validated by the same Zod schema and falls back to keywords on any failure.
**Outcome:** the app's logic is testable and explainable; "missing credentials" degrades gracefully instead of crashing.

## [13:29] Keyword matching uses word boundaries, not substring includes
**Context:** the parser tables list "run" and "running" as separate keywords.
**Decision / Problem:** plain `includes` would make "run" match inside "brunch" and make the separate "running" entry redundant. Matching each keyword with a `\b…\b` regex keeps the tables literal and avoids false positives. Side effect: "tonight" sets period=night but not requireDaylight=false, because the daylight table only lists "night"/"after dark" — the tables are applied exactly as written.
**Outcome:** demo sentence parses correctly; arbitrary text falls back to generic/week/any without throwing.

## [13:52] AI bug: PowerShell edit corrupted UTF-8 in SearchForm.tsx
**Context:** the AI used a PowerShell -replace + Set-Content one-liner to rename a Tailwind class.
**Decision / Problem:** Windows PowerShell 5.1 read the BOM-less UTF-8 file as ANSI and re-encoded it, mangling "…" and "·" into mojibake. Caught by IDE diagnostics right after the edit; the file was rewritten from scratch with the editor tool instead.
**Outcome:** rule adopted for the rest of the build — never edit source files through PowerShell string operations.

## [13:55] Verified the dashboard in a real browser, not just curl
**Context:** Phase 8's gate includes browser-only checks (blue window outline, error box, blocked empty submit, 375px overflow).
**Decision / Problem:** drove headless Edge with a throwaway playwright-core script kept outside the repo, screenshotting idle/result/error/mobile states and counting .best-window-bar elements.
**Outcome:** all four browser checks confirmed with screenshots; the only console entry is the browser's own 404 network log when the API correctly returns LOCATION_NOT_FOUND.

## [14:20] LLM parser enabled (OpenRouter) — fallback design and where it disagrees with keywords
**Context:** Phase 9 got the go: parseIntentWithLlm posts to an OpenAI-compatible chat/completions endpoint and is validated by the same ParsedIntentSchema as the keyword parser.
**Decision / Problem:** the LLM is never load-bearing — no key means it is not even attempted, and any thrown error (401, timeout, bad JSON, schema mismatch) logs one console.warn and falls back to keywords; verified live with a valid key (parsed by: llm), a wrong key (401 → keyword, request still 200), and no key. Ran both parsers on 3 sentences: on "morning jog on Saturday if it isn't too windy" the keyword parser matches "windy" and *raises* maxWind to 60 while the LLM keeps 30 — the LLM understood the negation; on "take the dog out after work tomorrow" the LLM inferred walking in the evening where keywords give generic/any; on the demo sentence they agree except the LLM keeps the running default temp band {8,18} vs the keyword "cool" mapping {10,18}.
**Outcome:** parsed by: llm in the UI with graceful degradation; the deterministic parser remains the guaranteed path.

## [14:25] API surprise: the LLM bled one enum into another
**Context:** "go on a coffee with friends" made gpt-4o-mini answer dayToken: "any" — a valid *period* value but not a valid *dayToken* — so Zod rejected it and the app fell back to keywords (correctly, but needlessly).
**Decision / Problem:** two-layer fix: the system prompt now says explicitly that "any" is not a valid dayToken, and a small withEnumDefaults() step maps invalid enum values to their documented defaults (generic/week/any) before validation. Numbers and booleans stay strictly Zod-validated, so the schema remains the gate.
**Outcome:** the same sentence now parses via the LLM; the fallback still catches everything else.

## [14:40] User decision: real hover tooltips on the chart bars
**Context:** the build prompt specified native title-attribute tooltips only ("no custom popover"); in practice they need a ~1s motionless hover and the user reported them as not showing.
**Decision / Problem:** the user overrode the prompt: bars now get an instant CSS-only tooltip (white pill, hairline border, 12px text, no shadow — inside the design system) shown via group-hover; title and aria-label stay for accessibility.
**Outcome:** hover info is immediately visible; no JS, no library, design rules intact.

## [14:45] User decision: history rows re-open their stored result
**Context:** the build prompt explicitly ruled out getSearch(id) ("Don't add it"); the user asked for it — history rows showed only the score, but resultJson already stores every full Recommendation.
**Decision / Problem:** added getSearch() in lib/db.ts, GET /api/history/[id], and made history rows buttons: clicking restores that search's recommendation card and chart from the stored snapshot and refills the form with the original inputs. The snapshot is shown as saved — it is not re-fetched or re-scored.
**Outcome:** stored data is now visibly useful in the UI, which also demonstrates why resultJson was persisted in the first place.

## [14:50] AI bug: the first hydration guard caused the warning it was meant to prevent
**Context:** "no response on first search" was a pre-hydration native form submit (measured: the API answers a cold first request in ~3.4s), so the submit button is disabled until React hydrates.
**Decision / Problem:** the first version used useState + useEffect, which — combined with stale dev bundles across server restarts — surfaced React hydration-mismatch warnings on the button. Replaced with useSyncExternalStore (server snapshot false, client snapshot true), React's sanctioned API for values that legitimately differ between server and client.
**Outcome:** clean console verified in a real browser; the too-early click now does nothing instead of silently reloading the page.
