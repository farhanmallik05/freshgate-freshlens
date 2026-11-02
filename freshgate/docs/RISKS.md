# FreshGate Risk Analysis & Mitigation Matrix

| ID | Risk Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| R1 | Bifrost Go plugin ABI or dependency mismatch | High | Medium | Build in-tree inside Docker using exact pinned Bifrost version. |
| R2 | Recursive verification calls via gateway | High | Medium | Engine sets `x-freshgate-mode: off` on all outbound LLM calls. |
| R3 | Tavily API 429 rate limit or 434 capacity limit | Medium | Medium | Automated Retry-After backoff; fallback search without `max_age_hours` on 434. |
| R4 | Semantic cache stores obsolete data | High | Low | Volatility classifier sets `x-bf-cache-ttl` and `x-bf-cache-no-store` in `PreLLMHook`. |
| R5 | LLM produces malformed extraction JSON | Medium | Medium | Zod schema validation, repair retry prompt, deterministic heuristic fallback. |
| R6 | Gateway latency penalty in production | High | Low | Async verification mode executes non-blocking via background worker pool (< 2ms p95). |
| R7 | Engine failure breaks user completions | Critical | Low | Fail-open circuit breaker passes through raw LLM completion if engine times out or errors. |
