# FreshGate + FreshLens Technical Architecture & Specification

## 1. System Components & Boundaries

The system is organized into three interoperable projects sharing exact contracts:

```
+-----------------------------------------------------------------------------------+
|                                 FreshGate Monorepo                                |
|                                                                                   |
|  +--------------------+        +---------------------+        +----------------+  |
|  |  plugin/freshgate  |        |     engine/src      |        |   dashboard/   |  |
|  |  (Go Bifrost Mid)  | <----> |  (Hono TS Engine)   | <----> |  (Next.js UI)  |  |
|  +--------------------+        +----------+----------+        +----------------+  |
|            ^                              ^                                       |
|            |                              |                                       |
|            v                              v                                       |
|  +--------------------+        +----------+----------+        +----------------+  |
|  |  bifrost Gateway   |        |   SQLite / Cache    |        |     bench/     |  |
|  |  (github/maximhq)  |        |   (WAL + Hashes)    |        |  (StaleBench)  |  |
|  +--------------------+        +---------------------+        +----------------+  |
+-------------------------------------------+---------------------------------------+
                                            ^
                                            | REST API /verify
                                            v
+-----------------------------------------------------------------------------------+
|                                     FreshLens                                     |
|  +-----------------------+     +----------------------+     +------------------+  |
|  |  Background Worker    | <-> |  Content Script      | <-> |  site/           |  |
|  |  (Messaging + Cache)  |     |  (TreeWalker + CSS)  |     |  (Landing/Demo)  |  |
|  +-----------------------+     +----------------------+     +------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Bifrost Plugin Architecture (Go)

### Hook Placement & Ordering
Bifrost executes plugins based on configuration `placement` (`pre_builtin` vs `post_builtin`) and `order` integer:
1. `PreLLMHook`: Runs before Bifrost built-in plugins (specifically semantic caching).
   - Inspects the user's prompt text.
   - Evaluates prompt volatility regexes (`realtime`, `high`, `medium`, `low`, `static`).
   - If client sent `x-bf-cache-key` and did not specify `x-bf-cache-ttl`, injects calculated TTL (e.g., `realtime` -> `x-bf-cache-no-store: true`, `high` -> 3600s).
2. `PostLLMHook`: Runs after completion is generated, but before final output serialization.
   - Deep-copies response object to protect cache immutability.
   - Dispatches verification job to worker pool if `mode == async`.
   - Executes synchronous verification and appends correction if `mode == correct`.
3. `HTTPTransportResponseHeadersHook`: Writes `x-freshgate-id`, `x-freshgate-status`, `x-freshgate-score`, `x-freshgate-band`.
4. Fail-Open Circuit Breaker:
   - Tracks consecutive engine failures (threshold = 5).
   - If breaker is OPEN, plugin bypasses engine calls and returns raw response with header `x-freshgate-status: breaker_open`.
   - Enters HALF-OPEN probe after 30 seconds.

---

## 3. Freshness Engine Core (TypeScript / Hono)

### Pipeline Stages
1. **Request Intake & Validation:** Zod validation on `VerifyRequest`.
2. **Prompt Volatility Classification:** Pure function evaluating 5 volatility categories in < 2ms without external network.
3. **Atomic Claim Extraction:**
   - Heuristic candidate scan targets dates, model versions, prices, currency, executive titles, status phrases.
   - Structured JSON schema prompt to LLM (`x-freshgate-mode: off` prevents recursion).
   - Exact span anchoring maps claim text back to UTF-16 substring character offsets in the input text.
   - Deduplication via normalized string Jaccard similarity.
4. **Staleness Prior ($P$):**
   $$P = 1 - 0.5^{D/H}$$
   - Where $H \in \{14, 45, 60, 120, 180, 365\}$ days depending on category.
   - Evergreen claims receive $P = 0$ and are marked `skipped_evergreen`.
5. **Two-Tier Deduplication Cache:**
   - Key: `sha256(trim(lowercase(claim.normalized)) + "|" + category)`
   - On cache hit: returns previous verified result with age and 0 credit expenditure.
   - Concurrency Singleflight: identical concurrent in-flight claims collapse into one promise.
6. **Tavily Live Retrieval:**
   - Search parameters dynamically adjusted by category.
   - `search_depth`: `basic` (fast) or `advanced` (thorough).
   - `max_age_hours`: 24 for volatile categories, retried without on HTTP 434.
   - Rate limiting and rolling hourly credit budgeting.
7. **Adversarial-Resistant LLM Judge:**
   - Ingests claims and normalized primary evidence.
   - Treats evidence as untrusted data (escapes prompt injections like "ignore instructions").
   - Output: `verdict` (`current` | `stale` | `unverifiable`), `correction`, `judge_confidence`, `reasoning`.
8. **Mathematical Scorer:**
   - Composite Authority $A$, Recency $R$, Confidence $K$.
   - $C = \text{clamp}(0.5A + 0.3R + 0.2K, 0, 1)$.
   - Per-claim freshness and overall score calculation.

---

## 4. FreshLens Chrome Extension (MV3)

### DOM & Highlighting Architecture
1. **TreeWalker TextMap:**
   - Crawls DOM text nodes while skipping hidden elements, scripts, styles, and citation badges.
   - Generates an array of `{ node, start, end }` offsets relative to full extracted plain text.
2. **CSS Custom Highlight API:**
   - Creates `Highlight` instances registered in `CSS.highlights`:
     - `fl-fresh`: emerald underline
     - `fl-aging`: amber dashed underline
     - `fl-stale`: rose wavy underline
   - Zero DOM mutation, zero React reconciliation interference, zero layout shift.
   - Fallback to safe `<mark data-fl-claim>` injection when Custom Highlight API is unsupported.
3. **Shadow DOM Overlay:**
   - Completely isolated styles prevent CSS leakage to/from host chat applications.
   - Floating UI popovers anchored to highlight bounding client rects.
   - Keyboard accessible navigation (Tab, Enter, Escape).
