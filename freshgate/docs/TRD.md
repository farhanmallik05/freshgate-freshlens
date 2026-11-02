# FreshGate Technical Requirements Document (TRD)

## 1. System Architecture & Boundaries
FreshGate consists of:
1. `plugin/freshgate`: Go plugin for the Bifrost gateway implementing `PreLLMHook`, `PostLLMHook`, and `HTTPTransportResponseHeadersHook`.
2. `engine/`: TypeScript / Hono microservice handling claim extraction, prompt classification, Tavily search, LLM judging, and scoring.
3. `dashboard/`: Next.js 15 App Router operator dashboard with live SSE telemetry and analytics.
4. `bench/`: StaleBench evaluation suite.

---

## 2. Sequence Diagrams

### 2.1 Synchronous Flow (`x-freshgate-mode: sync` or `correct`)
```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Gateway as Bifrost Gateway
    participant Plugin as FreshGate Go Plugin
    participant Engine as Freshness Engine
    participant Tavily as Tavily Search API

    Client->>Gateway: POST /v1/chat/completions (x-freshgate-mode: sync)
    Gateway->>Plugin: PreLLMHook()
    Plugin->>Plugin: Classify prompt volatility & set x-bf-cache-ttl
    Gateway->>Gateway: Check Semantic Cache / Forward to LLM
    Gateway-->>Plugin: PostLLMHook(response)
    Plugin->>Engine: POST /v1/verify {text, context}
    Engine->>Engine: Extract claims & compute prior P
    Engine->>Tavily: Search per claim (topic, time_range)
    Tavily-->>Engine: Sourced evidence snippets
    Engine->>Engine: LLM Judge & Score (Freshness 0-100)
    Engine-->>Plugin: VerifyResponse {overall, claims, corrected_text}
    alt mode == correct
        Plugin->>Plugin: Append correction block
    end
    Plugin-->>Gateway: Modified response + x-freshgate headers
    Gateway-->>Client: 200 OK with Verified Content
```

### 2.2 Asynchronous Flow (`x-freshgate-mode: async`)
```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Gateway as Bifrost Gateway
    participant Plugin as FreshGate Go Plugin
    participant Engine as Freshness Engine

    Client->>Gateway: POST /v1/chat/completions (x-freshgate-mode: async)
    Gateway->>Plugin: PreLLMHook()
    Plugin->>Plugin: Set x-bf-cache-ttl
    Gateway->>Gateway: Generate completion
    Gateway-->>Plugin: PostLLMHook(response)
    Plugin->>Plugin: Enqueue async job to worker pool (< 1ms)
    Plugin-->>Gateway: Set x-freshgate-status: queued
    Gateway-->>Client: 200 OK (Immediate completion, zero blocking)
    Plugin-)Engine: POST /v1/verify/async (background)
    Engine->>Engine: Verify & stream event via SSE /v1/events
```

### 2.3 Streaming Flow (`stream: true`)
```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Gateway as Bifrost Gateway
    participant Plugin as FreshGate Go Plugin
    participant Engine as Freshness Engine

    Client->>Gateway: POST /v1/chat/completions (stream: true)
    loop Stream Chunks
        Gateway->>Plugin: HTTPTransportStreamChunkHook()
        Plugin->>Plugin: Buffer assistant text (cap 64 KB)
        Plugin-->>Gateway: Forward raw chunk immediately
        Gateway-->>Client: Stream SSE chunk
    end
    Plugin->>Plugin: On final chunk -> Enqueue background async job
    Plugin-)Engine: POST /v1/verify/async
```

---

## 3. Failure Modes & Resilience
- **Engine Down / Unreachable:** Plugin circuit breaker trips after 5 consecutive failures. Requests immediately fail-open with `x-freshgate-status: breaker_open`.
- **Tavily 429 Rate Limit:** Engine respects `Retry-After` header (up to 2 retries) and degrades to `status: rate_limited` without crashing.
- **Tavily 434 Capacity Limit:** When `max_age_hours` returns 434 on non-paying tier, engine retries query once without `max_age_hours`.
- **Hourly Budget Exhaustion:** When hourly Tavily credits exceed `TAVILY_CREDIT_BUDGET_PER_HOUR`, claims are marked `budget_exhausted` and return score `55 * (1 - P)` with verdict `unverifiable`.

---

## 4. Performance Budgets
- **Async Gateway Overhead:** P95 latency overhead $< 2\text{ ms}$.
- **Prompt Classification Latency:** $< 2\text{ ms}$ (zero network calls, pure RE2 regex matching).
- **Sync Mode Gateway Timeout:** Hard bounded by `timeout_ms` (default 4000ms); degrades to async on timeout.
- **Claim Cache Lookup:** $< 5\text{ ms}$ via indexed SQLite lookup.
