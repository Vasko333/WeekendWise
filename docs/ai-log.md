# AI Development Log

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
