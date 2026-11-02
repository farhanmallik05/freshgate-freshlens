# FreshGate Technical Architecture & Design Decisions

## 1. System Topology & Component Map

FreshGate decouples the gateway execution path from heavy verification logic:

```mermaid
graph TB
    Client[Client Request] --> Gateway[Bifrost LLM Gateway]
    
    subgraph Plugin [Bifrost Go Plugin: freshgate]
        VolClass[Prompt Volatility Classifier\nRE2 regexes, < 0.1ms]
        CacheCtrl[Cache Control Hook\nSets x-bf-cache-ttl & no-store]
        Breaker[Circuit Breaker & Worker Pool\nBounded async worker]
    end
    
    Gateway --> VolClass
    VolClass --> CacheCtrl
    CacheCtrl --> SemCache[Bifrost Semantic Cache]
    SemCache --> LLM[Model Provider]
    LLM --> Breaker
    
    subgraph Engine [TypeScript Freshness Engine :8787]
        ClaimExt[Heuristic + LLM Claim Extractor]
        DecayPrior[Staleness Prior Decay Function]
        TavilyRet[Tavily Search API & Authority Tiering]
        JudgeLLM[Prompt-Injection Safe LLM Judge]
        ScorerMath[SPEC Scorer Math: A, R, K, C, Freshness]
        DB[(SQLite WAL Store & Claim Cache)]
    end
    
    Breaker -.->|Async: fire-and-forget| ClaimExt
    Breaker -->|Sync/Correct: HTTP POST| ClaimExt
    ClaimExt --> DecayPrior
    DecayPrior --> TavilyRet
    TavilyRet --> JudgeLLM
    JudgeLLM --> ScorerMath
    ScorerMath --> DB
```

---

## 2. Sequence Diagrams

### 2.1 Asynchronous Mode (Default Production Path)
```mermaid
sequenceDiagram
    autonumber
    Client->>Gateway: POST /v1/chat/completions (x-freshgate-mode: async)
    Gateway->>Plugin: PreLLMHook()
    Plugin->>Plugin: Classify prompt volatility (< 0.1ms)
    Plugin->>Gateway: Set x-bf-cache-ttl
    Gateway->>Model: Call LLM
    Model->>Gateway: Return Answer
    Gateway->>Plugin: PostLLMHook()
    Plugin->>WorkerPool: Enqueue Verification Job (< 1ms)
    Plugin-->>Client: Return Answer + x-freshgate-id: fg_123
    WorkerPool->>Engine: POST /v1/verify/async
    Engine->>Tavily: Search & Judge
    Engine->>Dashboard: Emit SSE verification.completed
```

### 2.2 Correct Mode (Auto-Correction Path)
```mermaid
sequenceDiagram
    autonumber
    Client->>Gateway: POST /v1/chat/completions (x-freshgate-mode: correct)
    Gateway->>Model: Execute Completion
    Model->>Gateway: Raw Answer
    Gateway->>Plugin: PostLLMHook()
    Plugin->>Engine: POST /v1/verify
    Engine->>Tavily: Fetch Live Official Evidence
    Engine-->>Plugin: Return Stale Verdict + Verified Correction
    Plugin->>Plugin: Deep-copy response body & append Markdown correction
    Plugin-->>Client: Corrected Answer + x-freshgate-score
```

### 2.3 Fail-Open Circuit Breaker Recovery
```mermaid
sequenceDiagram
    autonumber
    Note over Plugin, Engine: Engine unreachable / 5 consecutive network errors
    Plugin->>Plugin: Breaker State -> StateOpen (30s)
    Client->>Gateway: Completion Request
    Gateway->>Plugin: PostLLMHook()
    Plugin->>Plugin: Breaker Check (Open) -> Bypass Engine immediately
    Plugin-->>Client: Return clean answer + x-freshgate-status: breaker_open
    Note over Plugin: Zero added latency, zero user downtime
```

---

## 3. Fundamental Design Decisions & Trade-Offs

### 1. Why an LLM Gateway Plugin rather than an SDK wrapper?
- **Zero Code Changes:** Enterprise engineering teams cannot rewrite thousands of prompts or SDK calls. By deploying FreshGate as a Bifrost gateway plugin, every internal application routed through Bifrost automatically receives freshness tracking, TTL optimization, and hallucination defense without touching a single line of app code.
- **Hook Sequencing Power:** Running as `pre_builtin` allows FreshGate to govern Bifrost's semantic cache TTL *before* the cache layer processes the query.

### 2. Why a Mathematical Staleness Prior ($P = 1 - 0.5^{D/H}$)?
- Verifying every single statement against the web wastes search credits and introduces latency.
- Stable/evergreen facts (math definitions, historical events, chemical structures) have infinite half-life ($H = \infty$), yielding prior $P = 0$. FreshGate skips them with status `skipped_evergreen`, preserving Tavily credits for rapidly decaying facts (pricing tiers, software releases, leadership changes).

### 3. Why Claim-Level Caching instead of Full-Answer Caching?
- Two completely different prompts ("What is Next.js 14 pricing?" and "Tell me about Next.js and ChatGPT Plus") share the identical claim: `Next.js 14 is the latest version`.
- By computing `sha256(normalized_claim + "|" + category)`, verified claims are shared across the entire organization, delivering **0 Tavily credit cost** on repeat queries.
