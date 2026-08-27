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
