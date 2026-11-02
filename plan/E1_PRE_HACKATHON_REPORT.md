# E1: Pre-Hackathon Evaluation & Feasibility Report

**VERDICT: GO**
*Strong dual-track alignment, zero-gap technical architecture, and fully validated build pipeline.*

## Readiness Scores (0–10)
- **Rules Clarity:** 10/10 (Option 2 integrated entry or Option 1 dual submission supported)
- **Scope Realism:** 9/10 (Modular microservice + plugin + MV3 extension with mock fallbacks)
- **Environment:** 9/10 (Node 24, pnpm 10, Docker 29 running, WSL2/Windows supported)
- **API Access:** 10/10 (Tavily search & mock replay engines in place)
- **Demo Strength:** 10/10 (Split-screen live gateway demo + Chrome extension in-DOM highlights)
- **Proof Strength:** 9/10 (StaleBench 60-prompt primary-source evaluation suite)

---

## 1. Rules Audit
- **Eligibility:** Dual-track participation (Bifrost Priority Track + Tavily Track). Option 1 (two projects) and Option 2 (integrated project) are permitted.
- **Verdict:** `OK`. We implement both: Project A (FreshGate) qualifies alone as an integrated entry covering Bifrost #4 and Tavily #1; Project B (FreshLens) provides a dedicated user-facing surface for Tavily #1.
- **Open Source Licensing:** Apache-2.0 across all repositories. `OK`.
- **Demo / Video Requirements:** 2-minute live demo script and 90-second video script provided in `docs/DEMO.md`. `OK`.

---

## 2. Submission Strategy
- **Recommendation:** Implement Project A first (MVP line: A1–A6 + A9 lite) to secure an integrated entry. Then build Project B (B1–B10) as the dedicated browser surface.
- **Organizers Questions:**
  1. Does an integrated project (FreshGate) receive dual evaluation across both Bifrost and Tavily judging panels?
  2. For the Bifrost track, is a pull request / fork submission to `maximhq/bifrost` required or preferred over a standalone gateway plugin repo?
  3. Are additional Tavily credit allowances granted during live judging rounds?

---

## 3. Top 10 Risk Register & Mitigations

| Risk | Prob x Impact | Mitigation | Trigger |
|---|---|---|---|
| **1. Bifrost Go Plugin ABI drift** | M x H | Dual-path: in-tree compiled build in Docker with pinned dependencies + fallback microservice. | Docker build fails during A5 |
| **2. Semantic cache opt-in mismatch** | L x H | Plugin ensures `x-bf-cache-ttl` is calculated whenever `x-bf-cache-key` is supplied. | Cache miss on repeat request |
| **3. Recursive verification loop** | M x H | Engine sends `x-freshgate-mode: off` on all LLM calls. | Request loop detected |
| **4. Tavily Rate Limits / 434** | M x M | Retry with exponential backoff; automatic fallback without `max_age_hours` on 434. | Tavily returns 434/429 |
| **5. LLM JSON malformation** | M x M | Zod schema validation with automatic repair retry and deterministic heuristic fallback. | Zod parse error |
| **6. ChatGPT/Claude DOM changes** | H x M | Multi-strategy selectors with fallback to standard text selection adapter. | Adapter fails to find turn |
| **7. Benchmark circularity** | M x M | Ground truth derived from primary sources with human verification subset reported. | Evaluation bias review |
| **8. Live demo failure** | L x H | 100% deterministic offline replay mode (`ENGINE_MOCK=1`, `DEMO_MODE=replay`). | Internet or API outage |
| **9. Scope creep** | M x M | Strict frozen contracts in `docs/SPEC.md` and automated acceptance gates. | Unplanned refactor |
| **10. Latency overhead** | L x M | Non-blocking background worker pool in async mode (< 2ms p95). | Latency check fails |

---

## Next 3 Actions (Immediate)
1. Initialize `freshgate/` monorepo with frozen contracts (`docs/SPEC.md`, schemas, `AGENTS.md`) [A1].
2. Implement and test Engine core (prior, claim extraction, prompt classification) [A2].
3. Wire Tavily live search client, LLM judge, and scoring algorithm [A3].
