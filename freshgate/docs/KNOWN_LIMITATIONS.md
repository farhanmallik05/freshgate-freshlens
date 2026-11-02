# FreshGate: Known Limitations & Edge Cases

This document candidly outlines the known architectural trade-offs, edge cases, and operational boundaries of FreshGate v1.0.0.

---

## 1. Single-Writer SQLite Concurrency
- **Observation:** FreshGate engine uses SQLite in Write-Ahead Logging (WAL) mode for claim-level cache and verification persistence.
- **Boundary:** High-concurrency write bursts exceeding 500 simultaneous write transactions can experience momentary write-lock contention (`SQLITE_BUSY`).
- **Mitigation in Place:** The worker queue uses a bounded in-memory queue with graceful degradation and dropping of oldest async jobs under excessive load.
- **Production Path:** For multi-node distributed enterprise deployments, swap SQLite with PostgreSQL / Spanner.

---

## 2. Tavily Free-Tier Rate Limits (1,000 requests/month)
- **Observation:** High-volume benchmark sweeps or unthrottled gateway traffic will deplete Tavily free-tier credits.
- **Mitigation in Place:**
  1. Heuristic Staleness Prior skips evergreen queries entirely (0 credits).
  2. Claim-level caching with category-specific TTLs (up to 30 days for static, 6 hours for pricing).
  3. `max_age_hours` retry fallback on plan limitations.
  4. Demo replay mode (`NEXT_PUBLIC_DEMO=1` and `DEMO_MODE=replay`) allows 100% offline demonstration without external network requests or credit burn.

---

## 3. Synchronous Mode Latency Impact
- **Observation:** In `sync` mode, Bifrost waits for the Freshness Engine to extract claims, query Tavily, and run the LLM judge.
- **Latency Profile:** Sync mode introduces 1,200ms – 2,800ms of end-to-end response delay.
- **Recommendation:** Use `sync` only for high-stakes compliance or audit workloads. For standard consumer applications, default to `async` mode, which adds `< 0.8ms` p95 overhead to the gateway response.

---

## 4. LLM JSON Parsing on Frontier Model Drift
- **Observation:** Heuristic JSON extraction regex handles code fences and markdown wrappers, but rare non-compliant model outputs can trigger a single retry.
- **Mitigation in Place:** Two-stage repair: automated JSON repair prompt retry followed by fallback to safe heuristic extraction. If both fail, claim verification marks the claim as `unverifiable` rather than aborting.
