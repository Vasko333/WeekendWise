# AI Development Log

## [13:20] Dropped FastAPI in favor of Next.js route handlers
**Context:** initial plan was Next + FastAPI.
**Decision / Problem:** one runtime, one package manager, one deploy story; the backend is two endpoints, which does not justify a second server.
**Outcome:** single-language repo.

## [13:20] Demoted the LLM to an optional parser
**Context:** initial plan had the LLM as the intent engine.
**Decision / Problem:** deterministic keyword parser is primary so the demo works with no key; the LLM parser is validated by the same Zod schema and falls back to keywords on any failure.
**Outcome:** the app's logic is testable and explainable; "missing credentials" degrades gracefully instead of crashing.
