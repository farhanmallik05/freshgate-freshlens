# FreshGate & FreshLens: Hackathon Submission

## 1. Project Overview & Inspiration
Large Language Models are inherently static frozen artifacts: their knowledge ends abruptly at their training cutoff date. Yet millions of developers, customer support agents, and enterprise apps rely on them daily for time-sensitive queries—current pricing, latest library versions, executive leadership, and policy shifts. When a model hallucinates an obsolete answer, the failure is silent, confident, and damaging.

**FreshGate** solves this at the infrastructure layer: a native Go plugin for the open-source **Bifrost LLM Gateway** paired with a TypeScript **Freshness Engine** and **FreshLens** Chrome Extension. It intercepts model outputs, extracts atomic checkable claims, verifies each against live authoritative web evidence via the **Tavily Search API**, governs Bifrost semantic cache TTLs from prompt volatility, and auto-corrects stale answers—with strict fail-open guarantees and sub-2ms gateway overhead.

---

## 2. Track 1: How FreshGate Satisfies Bifrost #4 (Missing Gateway Feature)

| Rubric Dimension | FreshGate Implementation | Evidence |
|---|---|---|
| **Operator Value: "Would operators miss it if removed?"** | Without FreshGate, gateways blind-cache responses with fixed TTLs, caching stale answers and propagating hallucinations across all downstream apps. FreshGate gives operators an automated freshness radar and protects semantic caches from storing obsolete data. | Dashboard overview metrics, live SSE feed, model decay breakdown. |
| **Integration Depth** | Implemented directly on Bifrost's Go plugin interfaces (`PreLLMHook`, `PostLLMHook`, `HTTPTransportResponseHeadersHook`) registered as `pre_builtin` (order 0). | `plugin/freshgate/freshgate.go`, `deploy/bifrost/freshgate.patch`. |
| **Semantic Cache Governance** | Bifrost's cache is opt-in (`x-bf-cache-key`). FreshGate's PreLLMHook classifies prompt volatility (< 0.1ms) and injects `x-bf-cache-ttl` (e.g. 3600s for high, 86400s for medium) and `x-bf-cache-no-store: true` for realtime volatility. | `plugin/freshgate/cachecontrol.go`, verified in `smoke-bifrost.sh`. |
| **Fail-Open Resilience** | If the verification engine or internet connection fails, an automatic circuit breaker opens in < 0.1ms, allowing user traffic to flow uninterrupted with status `breaker_open`. | `plugin/freshgate/client.go`, demonstrated in `scripts/e2e-gateway.sh`. |
| **Performance Overhead** | Asynchronous mode introduces **p50: 0.4ms**, **p95: 1.1ms** overhead. | `docs/PERFORMANCE.md`, `bench/results/latest.json`. |

---

## 3. Track 2: How FreshGate Satisfies Tavily #1 (Stale Answer Detector)

| Rubric Dimension | FreshGate & FreshLens Implementation | Evidence |
|---|---|---|
| **Take Any LLM Answer** | Dual surfaces: transparently at the gateway for any backend API call, and in the browser via the FreshLens Chrome extension for ChatGPT/Claude. | Bifrost plugin + Chrome MV3 extension. |
| **Tavily API Depth** | Leverages Tavily Search API with `include_published_date`, `topic` (news vs general), `time_range`, `max_age_hours` (for breaking/realtime), `include_domains_mode: "prefer"` for official domains, and `include_usage`. | `engine/src/tavily.ts`. |
| **Credit Efficiency** | Staleness prior decay math ($P = 1 - 0.5^{D/H}$) filters out evergreen facts ($P=0$). Category-based claim-level caching stores verified statements, reducing repeated query cost to **0 Tavily credits**. | Average consumption: 0.58 credits/claim across StaleBench. |
| **Mathematical Freshness Scoring** | Composite formula $C = \text{clamp}(0.5A + 0.3R + 0.2K, 0, 1)$ incorporating domain authority ($A$), evidence recency decay ($R$), and judge confidence ($K$). | SPEC Section 6, `engine/src/score.ts`. |

---

## 4. Empirical Evaluation: StaleBench Results

We evaluated 60 prompts (42 time-sensitive prompts across 7 categories + 18 evergreen controls) across GPT-4o, Claude 3.5 Sonnet, and Llama 3.1 70B:

- **Stale Detection F1:** **91.2%** (95% CI [85.4%, 95.8%])
- **Detection Precision:** **94.1%** (95% CI [89.2%, 98.1%])
- **Detection Recall:** **88.5%** (95% CI [81.2%, 94.3%])
- **Evergreen False Positive Rate:** **0.0%** (0 / 18 controls flagged)
- **Credit Reduction:** **42% savings** via claim cache deduplication
- **Async Overhead:** **1.1ms (p95)**

---

## 5. Challenges Overcome
1. **Recursion Prevention:** When the engine calls an LLM (through Bifrost) to extract claims and judge, it sends `x-freshgate-mode: off`. The plugin recognizes this header and immediately bypasses processing, avoiding infinite verification loops.
2. **Deep-Copy Isolation:** In `correct` mode, modifying response strings could corrupt objects shared with the semantic cache. We deep-copy response payloads before attaching SPEC Section 7 correction blocks.
3. **RE2 Regex Portability:** Regular expressions were harmonized between Go RE2 and TypeScript RegExp by stripping inline `(?i)` flags and applying case-insensitive compilation flags natively in both runtimes.
