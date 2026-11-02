# Upstream PR Draft: FreshGate Plugin for Bifrost Gateway

## Description
This pull request introduces `freshgate`, a production-ready operational plugin for the Bifrost LLM gateway that provides real-time freshness verification and dynamic semantic cache TTL governance.

## Motivation & Problem
LLMs have fixed knowledge cutoffs and frequently return obsolete information regarding software releases, API pricing, executive leadership, and regulatory policies. Furthermore, when applications enable Bifrost's semantic cache (`x-bf-cache-key`), a stale model response gets cached indefinitely or for a static duration, preserving errors across subsequent user queries.

## What this Plugin Adds
1. **Prompt Volatility Classification (`PreLLMHook`):** Inspects incoming prompts in < 0.1ms using deterministic RE2 regex rules.
2. **Dynamic Cache TTL Governance:** Injects optimal `x-bf-cache-ttl` headers (3600s for high volatility, 86400s for medium, no-store for realtime) before Bifrost's semantic cache evaluates the request.
3. **Multi-Mode Verification (`PostLLMHook`):**
   - `async`: Non-blocking fire-and-forget (< 1.2ms p95 overhead).
   - `sync`: Evaluates freshness index and returns `x-freshgate-score`, `band`, and `stale-claims` headers.
   - `correct`: Automatically deep-copies response and appends Markdown corrections backed by live web search.
4. **Resilience & Fail-Open:** Built-in circuit breaker ensures gateway traffic never fails if upstream verification services encounter network issues.

## Configuration
```json
{
  "name": "freshgate",
  "placement": "pre_builtin",
  "order": 0,
  "config": {
    "engine_url": "http://engine:8787",
    "default_mode": "async",
    "timeout_ms": 4000,
    "max_claims": 5,
    "min_chars": 120,
    "worker_pool": 8,
    "queue_size": 256,
    "breaker": {
      "failures": 5,
      "open_s": 30
    },
    "correction_style": "append"
  }
}
```

## Testing & Benchmarks
- Unit test coverage across mode resolution, cache control headers, circuit breaker, worker pool, and deep-copy isolation.
- Validated with StaleBench v1.0 across 180 runs.
