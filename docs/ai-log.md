# AI Development Log

Tools used: ChatGPT (first idea and a second opinion on the plan), Claude (plan critique, the phased build prompt, review of this log), Claude Code (implementation). These entries are the decisions and problems worth discussing, not a full transcript.

## [Mon, planning] Planned with two assistants before writing any code
**Context:** I asked one assistant for an idea and a plan, then gave that plan to Claude with the instruction to challenge it rather than build it.
**Prompt excerpt:** "Do not write code yet. First: analyze the assignment requirements; identify the minimum end-to-end MVP; challenge this architecture if anything is unnecessarily complex; identify likely implementation risks; propose a strict implementation order suitable for a four-hour limit; separate MUST HAVE from NICE TO HAVE."
**Decision / Problem:** The two plans disagreed on three points: the backend, how to access the database, and the role of the LLM. I resolved each one myself (next three entries) and only then wrote the build prompt.
**Outcome:** Scope was fixed before implementation: one page, one POST endpoint, one table.

## [Mon, planning] Rejected the separate FastAPI backend
**AI suggestion:** The first plan proposed Next.js for the frontend and FastAPI as a separate backend with SQLAlchemy.
**Why I rejected it:** The backend is two endpoints. A second service means two runtimes, two package managers, CORS, two sets of run instructions and two deployment units, with no product benefit in a four-hour prototype. It is also not the stack I can modify fastest under interview pressure.
**My decision:** Next.js route handlers only.
**Tradeoff:** A separate backend becomes worth it if the API grows independently of the UI, needs Python-only libraries, or has to scale separately.

## [Mon, planning] Chose Prisma over better-sqlite3
**AI suggestion:** One assistant recommended better-sqlite3 with raw SQL: one table, three statements, no client generation. When I asked the other about the production story, it recommended Prisma.
**Why I chose Prisma:** I wanted the production answer to be a demonstrable mechanism, not a paragraph. With Prisma the swap to Postgres is `provider = "sqlite"` → `"postgresql"` plus a connection string; no application code changes. The database itself is still SQLite; Prisma is only the access layer.
**Tradeoff:** About 15 minutes of setup, JSON columns stored as `String` because Prisma has no `Json` type on SQLite, and I pinned Prisma 6 to avoid the v7 driver-adapter changes.

## [Mon, planning] Demoted the LLM from intent engine to optional parser
**AI suggestion:** The first plan had the LLM parsing every request, falling back to *default preferences* if it failed.
**Why I chose differently:** That makes the demo depend on an API key and a third-party service, and "defaults on failure" silently throws away what the user typed. I made a deterministic keyword parser the primary path and the LLM an enhancement behind an environment variable, validated by the same Zod schema, falling back to the keyword parser (not to defaults) on any error.
**Outcome:** The app runs with no key; the scoring logic is testable without mocking a model; "missing credentials" degrades instead of crashing.

## [13:15] The build ran from a phased master prompt, with me reviewing each phase
**Context:** I wrote one structured prompt before implementation: fixed architecture, the exact `lib/types.ts` contract, ten phases with time budgets, and a per-phase lifecycle of code → definition-of-done check → typecheck/tests → commit → push. Claude Code implemented within those boundaries; I reviewed at the checkpoints, tested the result myself, and changed several decisions along the way (entries below).
**Prompt excerpts:**
- "Understandability is a scored feature. Prefer fewer, smaller, obvious functions over clever ones. If you are choosing between 'elegant' and 'explainable in 30 seconds', choose explainable."
- "Explain before you build. Before each phase, write 3–6 lines: what you're about to implement, why, and any assumption you're making. Then implement."
- "'Fix' means fix the code, not the check. Do not relax a gate, delete a failing test, widen a `grep`, or add an exception to get green."
- "No architectural layers for single use. No repository pattern, no service classes, no DI, no barrel files."
**Outcome:** Every commit on `main` is a working, demoable state, so whatever was pushed at any point was submittable.

## [13:29] Keyword matching uses word boundaries, not substring includes
**Context:** The parser tables list "run" and "running" as separate keywords.
**Decision / Problem:** Claude Code pointed out that plain `includes` would match "run" inside "brunch" and make the "running" entry redundant, and matched each keyword with a `\b…\b` regex instead. I kept it because the tables stay literal and easy to edit. Known side effect: "tonight" sets `period=night` but not `requireDaylight=false`, because the daylight table only lists "night" / "after dark" — the tables are applied exactly as written.
**Outcome:** The demo sentence parses correctly; arbitrary text falls back to `generic/week/any` without throwing.

## [13:52] AI bug: a PowerShell edit corrupted UTF-8 in SearchForm.tsx
**Context:** Claude Code used a PowerShell `-replace` + `Set-Content` one-liner to rename a Tailwind class.
**Decision / Problem:** Windows PowerShell 5.1 read the BOM-less UTF-8 file as ANSI and re-encoded it, turning "…" and "·" into mojibake. Caught by IDE diagnostics right after the edit; the file was rewritten with the editor tool instead.
**Outcome:** Rule for the rest of the build: never edit source files through PowerShell string operations.

## [13:55] Verified the dashboard in a real browser, not just with curl
**Context:** Phase 8's gate had browser-only checks: blue outline on the best-window bars, the error box, blocked empty submit, no horizontal overflow at 375px.
**Decision / Problem:** Drove headless Edge with a throwaway playwright-core script kept outside the repo; screenshotted idle / result / error / mobile states and counted `.best-window-bar` elements.
**Outcome:** All four checks confirmed with screenshots. The only console entry is the browser's own 404 network log when the API correctly returns `LOCATION_NOT_FOUND`.

## [14:20] LLM parser enabled (OpenRouter): where it beats the keyword parser, and where it doesn't
**Context:** Phase 9 got the go. `parseIntentWithLlm` posts to an OpenAI-compatible `chat/completions` endpoint and is validated by the same `ParsedIntentSchema` as the keyword parser.
**Decision / Problem:** The LLM is never load-bearing: with no key it is not attempted; any thrown error (401, timeout, bad JSON, schema mismatch) logs one `console.warn` and falls back to keywords. Verified live with a valid key (`parsed by: llm`), a wrong key (401 → keyword, request still 200) and no key. I ran both parsers on three sentences: on "morning jog on Saturday if it isn't too windy" the keyword parser matches "windy" and *raises* `maxWind` to 60, while the LLM keeps 30 — it understood the negation; on "take the dog out after work tomorrow" the LLM inferred walking in the evening where keywords give `generic/any`; on the demo sentence they agree except the LLM keeps the running default temperature band {8,18} where the keyword "cool" maps to {10,18}.
**Outcome:** The LLM improves handling of negation and implied context; the deterministic parser remains the guaranteed path.

## [14:25] AI bug: the LLM bled one enum into another
**Context:** "go on a coffee with friends" made gpt-4o-mini answer `dayToken: "any"` — valid for `period`, not for `dayToken` — so Zod rejected the whole response and the app fell back to keywords (correct, but unnecessary).
**Decision / Problem:** Two-layer fix: the system prompt now states that "any" is not a valid `dayToken`, and a small `withEnumDefaults()` step maps invalid enum values to their documented defaults (`generic/week/any`) before validation. Numbers and booleans stay strictly Zod-validated, so the schema is still the gate; I did not loosen it.
**Outcome:** The same sentence now parses via the LLM; the fallback still catches everything else.

## [14:40] My decision: real hover tooltips on the chart bars
**Context:** My build prompt specified native `title`-attribute tooltips only ("no custom popover"). Using the dashboard myself, they needed about a second of motionless hover and looked like they weren't working.
**Decision / Problem:** I overrode my own prompt: bars get an instant CSS-only tooltip (white pill, hairline border, 12px text, no shadow — inside the design system) via `group-hover`; `title` and `aria-label` stay for accessibility.
**Outcome:** Hover info is immediately visible; no JS, no library.

## [14:45] My decision: history rows re-open their stored result
**Context:** My build prompt explicitly said "`getSearch(id)` is not needed. Don't add it." After using the UI, history rows showed only a score while `resultJson` already stored every full `Recommendation`, so the stored data wasn't doing anything visible.
**Decision / Problem:** Added `getSearch()` in `lib/db.ts`, `GET /api/history/[id]`, and made history rows buttons: clicking restores that search's recommendation card and chart from the stored snapshot and refills the form with the original inputs. The snapshot is shown as saved, not re-fetched or re-scored — history is what the app recommended at that time, and a fresh forecast could give a different answer.
**Outcome:** The database now stores something the UI visibly uses, which is why `resultJson` was persisted in the first place.

## [14:50] AI bug: the first hydration guard caused the warning it was meant to prevent
**Context:** "No response on first search" was a pre-hydration native form submit (measured: a cold first API request takes about 3.4 s), so the submit button is disabled until React hydrates.
**Decision / Problem:** The first version used `useState` + `useEffect`, which — together with stale dev bundles across server restarts — produced React hydration-mismatch warnings on the button. Replaced with `useSyncExternalStore` (server snapshot `false`, client snapshot `true`), React's sanctioned API for values that legitimately differ between server and client.
**Outcome:** Clean console verified in a real browser; a too-early click now does nothing instead of silently reloading the page.

## [FINAL] Requirement-by-requirement audit before submission
**Context:** Before submitting I gave Claude the original assignment again and asked for an audit without modifications.
**Prompt excerpt:** "Treat the assignment as the source of truth. For every minimum requirement and deliverable, mark the current implementation PASS, PARTIAL or FAIL and point to the file or README section that satisfies it. Do not modify anything."
**Outcome:** The submission was checked against the specification rather than from memory.
