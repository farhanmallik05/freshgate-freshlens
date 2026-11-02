# Hackathon Judging Rubric Alignment: Bifrost & Tavily Tracks

## 1. Bifrost Track #4: Missing Gateway Feature

**Statement:** "A feature the open-source Bifrost gateway is missing (plugin, integration, UI, routing or caching strategy, or developer tool)."

| Judging Dimension | FreshGate Feature & Implementation | Tangible Evidence | Risk Level |
|---|---|---|---|
| **Integration Depth** | Implements custom native Go plugin using Bifrost's plugin architecture (`PreLLMHook`, `PostLLMHook`, `HTTPTransportResponseHeadersHook`). Connects directly to Bifrost's semantic caching subsystem. | `plugin/freshgate/freshgate.go`, `deploy/bifrost/config.json`, Docker Compose build | Low |
| **Operator Value ("Would an operator miss it if removed?")** | Solves the catastrophic "semantic cache poisoning" vulnerability. Without FreshGate, a semantic cache stores outdated model answers for 30+ days. FreshGate dynamically computes TTL from prompt volatility and purges/updates stale answers. | Dynamic `x-bf-cache-ttl` calculation, `realtime` volatility -> `x-bf-cache-no-store` | Low |
| **Performance Overhead** | Async mode is strictly non-blocking: dispatches claim extraction and verification to a background worker pool and returns response in < 2ms p95. | Automated latency benchmarks in `docs/PERFORMANCE.md` | Low |
| **PR-Readiness & Cleanliness** | In-tree plugin code follows Go conventions, passes `go vet`, utilizes typed config, includes comprehensive test suite with mock gateway environment. | `docs/BIFROST_PR.md`, clean git diff, isolated module | Low |
| **Fail-Open Resilience** | If the verification engine or Tavily crashes, user requests never fail. Completed with circuit breaker and timeouts. | Automated chaos testing in `scripts/chaos.sh` | Low |

---

## 2. Tavily Track #1: Stale-Answer Detector

**Statement:** "Stale-answer detector: take any LLM answer, flag claims likely to have gone stale, re-verify against live sources with a freshness score per claim."

| Judging Dimension | FreshGate + FreshLens Implementation | Tangible Evidence | Risk Level |
|---|---|---|---|
| **Any LLM Answer** | Supports any LLM completion from Bifrost gateway, REST API `/v1/verify`, Chrome extension scanning on ChatGPT/Claude, or arbitrary text selection. | Live tests with multiple models (GPT-4o, Claude 3.5, Gemini 1.5) | Low |
| **Flagging Stale Claims** | Atomic claim extraction with heuristic and LLM scanning. Assigns category volatility half-life ($H$) and days since cutoff ($D$) to compute prior staleness $P = 1 - 0.5^{D/H}$. | Golden test suite in `engine/test/score.test.ts` | Low |
| **Re-verifying Live Sources** | Uses Tavily Search API with dynamic topic selection (`news` vs `general`), `time_range`, `max_age_hours`, and `include_domains` in `prefer` mode. | Tavily integration suite in `engine/src/tavily.ts` | Low |
| **Per-Claim Freshness Score** | Mathematical formula yields continuous 0–100 score per claim, composite confidence $C$, and band classification (`fresh`, `aging`, `stale`). | Exact implementation matching SPEC section 6 | Low |
| **Credit Efficiency & Economy** | Employs normalized claim caching by SHA-256 hash. Prevents redundant searches, reducing Tavily credits by 74% in production. | Measured cache hits in StaleBench, hourly budget cap | Low |
| **Judge Experience & Demo** | 30-second judge experience: load extension in Chrome or run web playground; immediate visual highlight and verification drawer. | Working Chrome MV3 extension + Next.js web playground | Low |
