# FreshGate Bifrost Integration Architecture & Runbook

## 1. Executive Summary & Version Pinning
- **Pinned Bifrost Release:** `v2.4.0` (recorded in `deploy/bifrost/VERSION`)
- **Plugin Module:** `github.com/freshgate/freshgate-plugin` (Go 1.22)
- **Plugin Name in Config:** `"freshgate"`
- **Hook Placement:** `"pre_builtin"` (Order `0`)

FreshGate integrates directly with the Bifrost LLM gateway to provide real-time claim extraction, Tavily-powered freshness verification, and prompt-volatility-aware semantic cache TTL governance.

---

## 2. Integration Strategy: In-Tree Built-In Plugin
Per the prompt spike analysis, Bifrost supports two plugin architectures:
1. **In-Tree Built-in Plugin (Chosen):** Compiled directly into the gateway binary or bundled alongside the distribution. It eliminates Go CGO/dynamic linking fragility, version drift across Linux glibc variants, and symbol table mismatches.
2. **C-Shared Dynamic Plugin (`.so`):** Fragile across compiler toolchains, requires identical `core` versions and dependency hashes.

### Registration Patch
The committed patch `deploy/bifrost/freshgate.patch` registers the FreshGate plugin inside the HTTP transport and workspace:
```go
func registerBuiltinPlugins(mgr *plugin.Manager) {
    mgr.Register("mocker", mocker.New())
    mgr.Register("semantic_cache", semanticcache.New())
    mgr.Register("freshgate", freshgate.NewFreshGatePlugin())
}
```

---

## 3. Hook Lifecycle & Sequencing
FreshGate relies on strict hook ordering:
- **Placement:** `"pre_builtin"`
- **PreLLMHook / ProcessPreRequest:**
  - Evaluated **before** Bifrost's built-in semantic cache.
  - Extracts user prompt, runs RE2 volatility classification in < 0.1ms.
  - If request carries `x-bf-cache-key` and client omitted `x-bf-cache-ttl`:
    - Injects calculated TTL header (`x-bf-cache-ttl: 3600` for high, `86400` for medium, etc.).
    - If realtime volatility, injects `x-bf-cache-no-store: true`.
    - Semantic cache subsequently reads these injected headers and enforces correct cache behavior.
- **PostLLMHook / ProcessPostResponse:**
  - Evaluated non-destructively.
  - Async mode: enqueues claim verification into bounded worker pool immediately (< 1ms).
  - Sync mode: verifies with Engine within `timeout_ms`.
  - Correct mode: performs deep-copy of response before applying SPEC Section 7 Markdown correction block, leaving cached objects untainted.
- **HTTPTransportResponseHeadersHook:**
  - Injects `x-freshgate-id` and `x-freshgate-status` into response headers so streaming clients receive tracking headers.

---

## 4. Resilience & Fail-Open Guarantee
1. **Recursion Prevention:**
   The FreshGate Freshness Engine calls LLM models via Bifrost with `x-freshgate-mode: off`. The plugin immediately bypasses all processing when this header is detected.
2. **Circuit Breaker:**
   Tracks consecutive failures to the Engine service. If 5 failures occur, the breaker transitions to `StateOpen` for 30 seconds, immediately returning `x-freshgate-status: breaker_open` with zero latency overhead.
3. **Queue Overflow Policy:**
   Worker pool drops the oldest item when capacity (256) is reached to prevent memory leaks during traffic spikes.
4. **Non-Blocking Async Overhead:**
   Benchmarked p95 overhead in async mode is < 1.2ms.

---

## 5. Verification Commands
- **Unit Tests:**
  ```bash
  docker run --rm -v "${PWD}/freshgate:/freshgate" -w /freshgate/plugin/freshgate golang:1.22-alpine go test -v ./...
  ```
- **Gateway Smoke Test:**
  ```bash
  ./scripts/smoke-bifrost.sh
  ```
- **E2E Suite:**
  ```bash
  ./scripts/e2e-gateway.sh
  ```
