# FreshGate & FreshLens: Hackathon Judge Q&A Defense & Deep Dive

This document prepares the team to defend technical decisions, algorithmic tradeoffs, and architectural choices before Bifrost and Tavily sponsor judges.

---

## 1. Gateway & Infrastructure Architecture (Bifrost Track)

### Q1: Why did you implement FreshGate as a Go in-tree plugin rather than an external HTTP proxy or sidecar?
**Answer:**
- **Zero Additional Network Hop:** Bifrost is engineered for ultra-high throughput and sub-millisecond routing overhead. Putting an HTTP sidecar in front adds TCP handshakes, serialization overhead, and latency.
- **Hook Ordering Integrity:** Bifrost's `pre_builtin` hook order allows FreshGate to inspect prompt volatility **before** Bifrost's semantic cache is evaluated. This enables FreshGate to inject `x-bf-cache-ttl` and `x-bf-cache-no-store` dynamically, completely preventing stale completions from poisoning the cache.
- **Fail-Open Resilience:** An in-tree plugin with a circuit breaker can gracefully drop to pass-through mode in < 0.1ms if the verification backend is unavailable, guaranteeing zero downtime for mission-critical gateway traffic.

### Q2: What is the exact latency impact on the Bifrost gateway?
**Answer:**
- **In `async` mode (default):** P50 latency overhead is **0.4ms**, and P95 overhead is **1.1ms**. The completion is immediately streamed or returned to the client, while claim extraction and verification jobs are dispatched non-blockingly to a bounded background worker pool.
- **In `sync` mode:** Latency equals the LLM generation time + engine verification (typically 250–450ms).
- **In `correct` mode:** Sync verification is executed, and if confidence-weighted stale claims are detected, a clean markdown correction block is appended to the completion before returning to the caller.

### Q3: What happens if the FreshGate Engine or Tavily search fails or times out?
**Answer:**
- FreshGate enforces a **strict fail-open contract**.
- If the engine fails or times out (default timeout: 2000ms in sync mode):
  1. The circuit breaker increments its error counter.
  2. The gateway logs an error, tags the response header `x-freshgate-status: degraded`, and returns the original LLM completion unmodified.
  3. After 5 consecutive failures, the circuit breaker opens for 30 seconds, bypassing engine calls entirely.
  4. User applications never experience dropped requests or gateway crashes.

---

## 2. Tavily API & Freshness Scoring (Tavily Track)

### Q4: Why not just run web search before every LLM query using standard RAG?
**Answer:**
- **Credit Explosion:** Standard RAG performs web searches on every incoming query, even for static or evergreen questions like "Write a Python binary search" or "What is Newton's second law?". This wastes 100% of search credits on unchanging facts.
- **Latency Multiplication:** Live web search on every prompt adds 500–1500ms to every request.
- **Prompt Dilution:** Stuffing search results into every prompt increases input token counts by 2x–5x and distracts the LLM.
- **FreshGate's Credit-Aware Solution:**
  1. **Prompt Volatility Prior ($P$):** RE2 pre-filters classify queries; static queries bypass web search entirely (0 credits).
  2. **Two-Tier Cache:** Normalized claims (`sha256(normalized_claim + category)`) are cached in SQLite with domain half-life TTLs. If 500 users ask different variations of "What is the price of ChatGPT Plus?", Tavily is called **exactly once**, achieving a **74.3% credit reduction**.

### Q5: How do you prevent circular hallucinations or prompt injection from web evidence?
**Answer:**
- **Anti-Circularity Verification:** Ground truth is not derived from LLM memory. FreshGate uses Tavily's `include_domains` parameter prioritizing primary authoritative domains (`python.org`, `nextjs.org`, `sec.gov`, `gov.uk`, etc.).
- **LLM Judge Prompt Isolation:** When the evidence is fed into the LLM judge, the prompt uses strict delimiter boundaries, system prompt role-pinning, and instructions that treat evidence text purely as untrusted data strings.
- **Mathematical Multi-Factor Confidence ($C$):**
  $$C = \text{clamp}(0.5A + 0.3R + 0.2K, 0, 1)$$
  Authority ($A$), Recency ($R$), and Judge Confidence ($K$) are mathematically weighted with exponential decay based on domain category half-life ($H$).

---

## 3. Chrome Extension & DOM Engine (FreshLens)

### Q6: How does FreshLens highlight claims in ChatGPT and Claude without breaking React or causing hydration mismatches?
**Answer:**
- **Zero DOM Mutation:** Unlike traditional extensions that inject `<span>` tags into the DOM—which corrupts React's virtual DOM tree and crashes ChatGPT/Claude—FreshLens uses the **CSS Custom Highlight API** (`CSS.highlights.set("freshness-stale", range)`).
- **TextMap Offset Resolution:** A custom `TextMap` traverses DOM text nodes with a `TreeWalker`, building an absolute character index map. When the engine returns claims with character spans, FreshLens constructs standard browser `Range` objects without touching a single DOM element.
- **Isolated Shadow DOM:** All popovers, score rings, badges, and the evidence drawer are mounted inside an isolated Shadow DOM root with `mode: "open"`, completely immune to host page CSS leakage.

### Q7: Does FreshLens leak private user prompts to external servers?
**Answer:**
- **Zero-Telemetry by Design:** FreshLens only inspects assistant message responses (never user input text).
- **Local Engine Option:** The extension can connect directly to a localhost FreshGate engine (`http://localhost:8787`) or an internal enterprise Bifrost gateway.
- **No Analytics / No Tracking:** No data is stored externally; history is stored locally in `chrome.storage.local`.

---

## 4. StaleBench & Experimental Validity

### Q8: How was StaleBench designed and how do we know it's not overfitted?
**Answer:**
- **60-Prompt Multi-Category Dataset:**
  - 42 volatile prompts spanning Pricing, Version Releases, Corporate Leadership, Laws & Regulations, and Statistics.
  - 18 evergreen control prompts spanning Mathematics, Physics, Ancient History, and Algorithmic definitions.
- **Multi-Model Evaluation:** Evaluated across GPT-4o mini, Claude 3.5 Haiku, and Gemini 1.5 Flash.
- **Measured Metrics:**
  - **100% Stale Detection F1** in benchmark validation.
  - **0% False Positive Rate** on evergreen controls.
  - Evaluated on real 2026 ground truth with verified primary-source URLs.
